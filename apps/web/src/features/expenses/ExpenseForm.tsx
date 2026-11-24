import { Input } from '../../components/ui/input.js';
import { useTranslation } from 'react-i18next';
import { currencyOption } from '../../i18n/currency-options.js';
import { Button } from '../../components/ui/button.js';
import React, { useEffect, useId, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { parseMoney } from '@split-ledger/shared';
import { expenseDraftKey, type RetainedExpenseDraft } from './expense-draft.js';
import {
  apiRequest,
  apiErrorMessage,
  ApiError,
  type Trip,
  type CurrencyList,
  type Expense,
  type Category,
  type ItemList,
  type TripMember,
} from '../../api/index.js';
import { DateField } from '../../components/DateField.js';
import { dateOnly, localToday, parseDate } from '../../components/date.js';
import { QueryState } from '../../components/QueryState.js';
import { BusyIndicator } from '../../components/waiting/BusyIndicator.js';
import { ActionButton } from '../../components/waiting/ActionButton.js';
import { SearchCombo } from '../../components/SearchCombo.js';
import { FormDialog } from '../../components/FormDialog.js';
import { useSession } from '../auth/session.js';
import { displayAmount } from './money.js';
import { ExpenseShares, formatShareAmount } from './ExpenseShares.js';
import {
  definitelyRejected,
  currentTripState,
  UnavailableTrip,
  OfflineWrite,
  UnconfirmedWrite,
  unconfirmedMessageKey,
  verifiedDelete,
  verifiedSave,
  type SaveIntent,
  type WriteIntent,
} from './save-outcome.js';
import { TripOperationCheck } from '../trips/TripOperationCheck.js';
import type { TripState } from '../trips/management-api.js';
import { readCategoryPreference, saveCategoryPreference } from '../categories/preference.js';
import { Icon } from '../../components/Icon.js';
import { readCurrencyPreference, saveCurrencyPreference } from './currency-preference.js';
import './messages.js';

type FieldErrors = Partial<
  Record<
    'item' | 'currency' | 'amount' | 'date' | 'payerMemberId' | 'shareMemberIds',
    string | ApiError
  >
>;

export interface ExpenseDraft {
  item: string;
  amount: string;
  currencyCode: string;
  spentOn: string;
  categoryId: string | null;
  payerMemberId: string | null;
  shareMemberIds: string[];
}

export function ExpenseForm({ initialDraft }: { initialDraft?: ExpenseDraft } = {}) {
  const { t } = useTranslation();
  const { tripId, expenseId } = useParams(),
    { account } = useSession();
  const trip = useQuery({
    queryKey: ['account', account!.id, 'trip', tripId],
    queryFn: ({ signal }) => apiRequest<Trip>(`/api/trips/${tripId}`, { signal }),
  });

  const expense = useQuery({
    queryKey: ['account', account!.id, 'expense', tripId, expenseId],
    queryFn: ({ signal }) =>
      apiRequest<Expense>(`/api/trips/${tripId}/expenses/${expenseId}`, { signal }),
    enabled: Boolean(expenseId),
  });

  if (!trip.data || (expenseId && !expense.data))
    return (
      <>
        <Link className="back" to={tripId ? `/trips/${tripId}` : '/trips'}>
          <Icon name="back" />
          <span>{t('expenses.backLedger')}</span>
        </Link>
        <QueryState
          label={t('expenses.formRegion')}
          layout="form"
          fetchStatus={
            trip.fetchStatus === 'paused' || expense.fetchStatus === 'paused'
              ? 'paused'
              : trip.fetchStatus
          }
          pending={trip.isPending || Boolean(expenseId && expense.isPending)}
          error={trip.error ?? expense.error}
          retry={() => {
            void trip.refetch();
            if (expenseId) void expense.refetch();
          }}
        />
      </>
    );

  return (
    <ExpenseEditor
      key={`${account!.id}:${tripId}:${expenseId ?? 'new'}`}
      trip={trip.data}
      expense={expense.data}
      initialDraft={initialDraft}
      readError={trip.error ?? expense.error}
    />
  );
}

function ExpenseEditor({
  trip,
  expense,
  readError,
  initialDraft,
}: {
  trip: Trip;
  initialDraft?: ExpenseDraft;
  expense?: Expense;
  readError: Error | null;
}) {
  const { t, i18n } = useTranslation();
  const { account } = useSession(),
    navigate = useNavigate(),
    client = useQueryClient();
  const tripId = trip.id;
  const itemId = useId(),
    amountId = useId();
  const itemInput = useRef<HTMLInputElement>(null),
    amountInput = useRef<HTMLInputElement>(null),
    writing = useRef(false);
  const [id] = useState(() => expense?.id ?? crypto.randomUUID());
  const [item, setItem] = useState(expense?.item ?? initialDraft?.item ?? ''),
    [currency, setCurrency] = useState(
      () =>
        expense?.currencyCode ??
        initialDraft?.currencyCode ??
        readCurrencyPreference(account!.id, tripId) ??
        'JPY',
    ),
    [amount, setAmount] = useState(expense?.amount ?? initialDraft?.amount ?? '');
  const [categoryChoice, setCategory] = useState<string | null>(
    expense ? (expense.category?.id ?? '') : initialDraft ? (initialDraft.categoryId ?? '') : null,
  );
  const [preferredCategory] = useState(() => readCategoryPreference(account!.id));
  const [submittedCategory, setSubmittedCategory] = useState<{
    value: string;
    label: string;
  } | null>(null);
  const [date, setDate] = useState(() =>
    (expense?.spentOn ?? initialDraft?.spentOn ?? dateOnly(localToday())).replaceAll('-', '/'),
  );
  const [payerMemberId, setPayerMemberId] = useState<string | null>(
    () =>
      expense?.payerMemberId ?? (initialDraft ? initialDraft.payerMemberId : trip.ownerMemberId),
  );
  const [shareMemberIds, setShareMemberIds] = useState<string[]>(
    () =>
      expense?.shares.map((share) => share.memberId) ??
      initialDraft?.shareMemberIds ?? [trip.ownerMemberId],
  );
  const members = useQuery({
    queryKey: ['account', account!.id, 'members', tripId],
    queryFn: ({ signal }) =>
      apiRequest<ItemList<TripMember>>(`/api/trips/${tripId}/members`, { signal }),
  });
  const [errors, setErrors] = useState<FieldErrors>({}),
    [saveError, setSaveError] = useState<string | Error>('');
  const [deleting, setDeleting] = useState(false);
  const [unconfirmed, setUnconfirmed] = useState<WriteIntent | null>(null);
  const [stateReadRequired, setStateReadRequired] = useState(false);
  const [checkingTrip, setCheckingTrip] = useState(false);
  const stateNotice = useRef<HTMLElement>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;

    return () => {
      alive.current = false;
    };
  }, []);
  const sameOwner = () =>
    alive.current && client.getQueryData<{ id: string }>(['session'])?.id === account!.id;
  const stateKey = ['account', account!.id, 'trip', tripId, 'entry-state', 'expense', id];
  const authority = useQuery<TripState | null>({
    queryKey: stateReadRequired
      ? stateKey
      : ['account', account!.id, 'expense-state-unobserved', tripId, id],
    queryFn: () => null,
    enabled: false,
    gcTime: 0,
  });
  const unavailable = authority.data && authority.data.state !== 'active' ? authority.data : null;
  const stateLocked = stateReadRequired && authority.data?.state !== 'active';

  async function readTripState() {
    setStateReadRequired(true);
    try {
      const current = await currentTripState(tripId);
      if (sameOwner()) client.setQueryData(stateKey, current);

      return current;
    } catch (error) {
      if (sameOwner()) client.setQueryData(stateKey, null);
      throw error;
    }
  }

  function showWriteError(error: Error) {
    if (!sameOwner()) return;
    setSaveError(error instanceof UnavailableTrip ? '' : error);
    if (error instanceof UnavailableTrip) {
      setDeleting(false);
      void client.cancelQueries({
        predicate: (query) =>
          query.queryKey[0] === 'account' &&
          query.queryKey[1] === account!.id &&
          query.queryKey.includes(tripId) &&
          !query.queryKey.includes('entry-state') &&
          query.queryKey[2] !== 'expense-draft',
      });
    }
    const observed = client.getQueryData<TripState | null>(stateKey);
    if (
      observed !== undefined &&
      observed?.state !== 'active' &&
      !(error instanceof UnconfirmedWrite)
    )
      requestAnimationFrame(() => stateNotice.current?.focus());
  }

  const currencies = useQuery({
    queryKey: ['currencies'],
    queryFn: ({ signal }) => apiRequest<CurrencyList>('/api/currencies', { signal }),
  });

  const categories = useQuery({
    queryKey: ['account', account!.id, 'categories'],
    queryFn: ({ signal }) => apiRequest<ItemList<Category>>('/api/categories', { signal }),
  });

  const category =
    categoryChoice ??
    (categories.data?.items.some((option) => option.id === preferredCategory)
      ? preferredCategory!
      : '');

  useQuery({
    queryKey: expenseDraftKey(account!.id, tripId),
    queryFn: (): RetainedExpenseDraft | null => null,
    enabled: false,
    gcTime: Infinity,
  });
  useEffect(() => {
    if (client.getQueryData<{ id: string }>(['session'])?.id !== account!.id) return;
    const key = expenseDraftKey(account!.id, tripId);
    if (!item && !amount) {
      client.removeQueries({ queryKey: key, exact: true });

      return;
    }
    client.setQueryData<RetainedExpenseDraft>(key, {
      id,
      item,
      amount,
      currencyCode: currency,
      spentOn: date,
      categoryId: category || null,
      payerMemberId,
      shareMemberIds,
    });
  }, [
    client,
    account,
    tripId,
    id,
    item,
    amount,
    currency,
    date,
    category,
    payerMemberId,
    shareMemberIds,
  ]);
  const awaitingPreference =
    categoryChoice === null &&
    Boolean(preferredCategory) &&
    (categories.isPending || Boolean(categories.error));
  const precision =
    expense?.currencyCode === currency
      ? expense.minorUnit
      : currencies.data?.items.find((option) => option.code === currency)?.minorUnit;
  const digits = currency === 'TWD' ? 0 : precision;

  function accepted(value: string) {
    return (
      value.length <= 25 &&
      (digits === undefined || digits === 0
        ? /^\d*$/
        : new RegExp(`^\\d*(?:\\.\\d{0,${digits}})?$`)
      ).test(value)
    );
  }

  function removesCharacters(next: string) {
    if (next.length >= amount.length || accepted(amount)) return false;

    let index = 0;
    while (index < next.length && amount[index] === next[index]) index++;

    return amount.slice(index + amount.length - next.length) === next.slice(index);
  }

  const currencyOptions =
    currencies.data?.items.map((option) => currencyOption(option, i18n.resolvedLanguage)) ?? [];

  if (expense && !currencyOptions.some((option) => option.value === expense.currencyCode))
    currencyOptions.push({
      value: expense.currencyCode,
      label: `${expense.currencyCode} · ${t('expenses.savedCurrency')}`,
    });

  function displayError(error: string | Error | undefined) {
    if (error instanceof ApiError) return apiErrorMessage(error);
    if (error instanceof UnconfirmedWrite)
      return t('expenses.' + unconfirmedMessageKey(error.intent.kind));
    if (error instanceof OfflineWrite)
      return t(error.kind === 'save' ? 'expenses.offlineSave' : 'expenses.offlineDelete');
    if (error instanceof Error) return error.message;

    return error ? t(error) : '';
  }

  async function saved(messageKey: string) {
    if (!sameOwner()) return;
    client.removeQueries({ queryKey: expenseDraftKey(account!.id, tripId), exact: true });
    await Promise.all(
      [
        'trip',
        'trips',
        'expense',
        'expenses',
        'expense-analysis',
        'totals',
        'categories',
        'settlement',
        'repayments',
      ].map((resource) =>
        client.invalidateQueries({ queryKey: ['account', account!.id, resource] }),
      ),
    );
    if (sameOwner()) navigate(`/trips/${tripId}`, { state: { messageKey } });
  }

  const mutation = useMutation({
    mutationFn: async (spentOn: string) => {
      if (!navigator.onLine) throw new OfflineWrite('save');

      const intent: SaveIntent = {
        kind: 'save',
        id,
        tripId,
        item: item.trim(),
        spentOn,
        currencyCode: currency,
        minorUnit: precision!,
        amountMinor: parseMoney(amount, precision!).toString(),
        categoryId: category || null,
        payerMemberId: payerMemberId!,
        shareMemberIds: [...shareMemberIds],
      };
      const payload = {
        item: item.trim(),
        spentOn,
        categoryId: category || null,
        ...(!expense || amount !== expense.amount ? { amount } : {}),
        ...(!expense || currency !== expense.currencyCode ? { currencyCode: currency } : {}),
        ...(!expense ? { id } : {}),
        ...(!expense || payerMemberId !== expense.payerMemberId ? { payerMemberId } : {}),
        ...(!expense ||
        [...shareMemberIds].sort().join() !==
          expense.shares
            .map((share) => share.memberId)
            .sort()
            .join()
          ? { shareMemberIds }
          : {}),
      };

      try {
        return await apiRequest<Expense>(
          `/api/trips/${tripId}/expenses${expense ? `/${id}` : ''}`,
          {
            method: expense ? 'PATCH' : 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(payload),
          },
        );
      } catch (error) {
        if (definitelyRejected(error)) {
          if (
            error instanceof ApiError &&
            ['TRIP_TRASHED', 'TRIP_PURGED', 'NOT_FOUND'].includes(error.code)
          ) {
            let current: TripState;
            try {
              current = await readTripState();
            } catch {
              throw new Error(t('expenses.saveStateUnknown'), {
                cause: error,
              });
            }
            if (current.state !== 'active') throw new UnavailableTrip(current);
          }
          throw error;
        }
        // The original UUID is queried after an unavailable response; no mutation is retried.
        const confirmed = await verifiedSave(intent);

        if (confirmed) return confirmed;

        throw new UnconfirmedWrite(intent, error);
      }
    },
    onSuccess: () => saved('expenses.saveSuccess'),
    onError: (error) => {
      showWriteError(error);
      if (error instanceof UnconfirmedWrite) setUnconfirmed(error.intent);
      if (error instanceof ApiError && error.field) {
        const field =
          error.field === 'currencyCode'
            ? 'currency'
            : error.field === 'spentOn'
              ? 'date'
              : error.field;

        if (
          ['item', 'currency', 'amount', 'date', 'payerMemberId', 'shareMemberIds'].includes(field)
        )
          setErrors((previous) => ({ ...previous, [field]: error }));
      }
    },
    onSettled: () => {
      writing.current = false;
    },
  });

  const deletion = useMutation({
    mutationFn: async () => {
      if (!navigator.onLine) throw new OfflineWrite('delete');

      try {
        await apiRequest<void>(`/api/trips/${tripId}/expenses/${id}`, { method: 'DELETE' });
      } catch (error) {
        if (definitelyRejected(error)) throw error;
        // An unavailable response does not justify a second DELETE.
        const intent = { kind: 'delete' as const, id, tripId };

        if (await verifiedDelete(intent, readTripState)) return;

        throw new UnconfirmedWrite(intent, error);
      }
    },
    onSuccess: () => saved('expenses.deleteSuccess'),
    onError: (error) => {
      showWriteError(error);
      if (error instanceof UnconfirmedWrite) setUnconfirmed(error.intent);
      if (error instanceof UnavailableTrip) setUnconfirmed({ kind: 'delete', id, tripId });
    },
    onSettled: () => {
      writing.current = false;
    },
  });

  const verification = useMutation({
    networkMode: 'always',
    mutationFn: async (intent: WriteIntent) =>
      intent.kind === 'save'
        ? Boolean(await verifiedSave(intent))
        : verifiedDelete(intent, readTripState),
    onSuccess: async (confirmed, intent) => {
      if (confirmed) {
        await saved(intent.kind === 'save' ? 'expenses.saveSuccess' : 'expenses.deleteSuccess');
      } else setSaveError('expenses.' + unconfirmedMessageKey(intent.kind));
    },
    onError: showWriteError,
    onSettled: () => {
      writing.current = false;
    },
  });

  const busy = mutation.isPending || deletion.isPending || verification.isPending || checkingTrip;
  const categoryOptions = [
    { value: '', label: t('expenses.uncategorized') },
    ...(categories.data?.items.map((option) => ({ value: option.id, label: option.name })) ?? []),
  ];

  if (
    (busy || unconfirmed) &&
    submittedCategory &&
    !categoryOptions.some((option) => option.value === submittedCategory.value)
  )
    categoryOptions.push(submittedCategory);

  async function recheck() {
    if (unconfirmed && !writing.current) {
      writing.current = true;
      try {
        await verification.mutateAsync(unconfirmed);
      } catch {
        /* Rendered by onError. */
      }
    }
  }

  async function checkTripState() {
    if (writing.current) return;
    writing.current = true;
    setCheckingTrip(true);
    try {
      const current = await readTripState();
      if (!sameOwner()) return;
      setSaveError(current.state === 'active' ? 'expenses.tripReady' : '');
      if (current.state === 'active')
        requestAnimationFrame(() => itemInput.current?.focus({ preventScroll: true }));
    } catch {
      if (sameOwner()) setSaveError('expenses.tripStateUnknown');
    } finally {
      writing.current = false;
      if (alive.current) setCheckingTrip(false);
    }
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (
      writing.current ||
      unconfirmed ||
      stateLocked ||
      awaitingPreference ||
      categories.isPending ||
      categories.error ||
      members.isPending ||
      members.error ||
      currencies.isPending ||
      currencies.error
    )
      return;

    const validation: FieldErrors = {};

    if (!item.trim()) validation.item = 'expenses.itemRequired';
    if (precision === undefined || currencies.error)
      validation.currency = 'expenses.currencyRequired';

    try {
      if (precision === undefined) throw new RangeError();
      if (!expense || amount !== expense.amount || currency !== expense.currencyCode)
        parseMoney(amount, precision, currency);
    } catch {
      validation.amount = 'expenses.amountRequired';
    }
    if (!payerMemberId) validation.payerMemberId = 'expenses.payerRequired';
    if (!shareMemberIds.length) validation.shareMemberIds = 'expenses.sharesRequired';
    const parsed = parseDate(date);

    if (!parsed) validation.date = 'expenses.dateInvalid';

    setErrors(validation);
    setSaveError('');
    if (Object.keys(validation).length) {
      if (validation.item) itemInput.current?.focus();
      else if (validation.amount) amountInput.current?.focus();

      return;
    }
    if (!navigator.onLine) {
      setSaveError('expenses.offlineSave');

      return;
    }
    // Freeze the effective preference and its display label before any unavailable response can lock this draft.
    setCategory(category);
    setSubmittedCategory(categoryOptions.find((option) => option.value === category) ?? null);
    writing.current = true;
    mutation.mutate(dateOnly(parsed!));
  }

  return (
    <>
      <Link className="back" to={`/trips/${tripId}`}>
        <Icon name="back" />
        <span>{trip.name}</span>
      </Link>
      <header className="page-head">
        <div>
          <h1>{t(expense ? 'expenses.editTitle' : 'expenses.newTitle')}</h1>
          <p className="muted">
            {t(expense ? 'expenses.editDescription' : 'expenses.newDescription')}
          </p>
        </div>
      </header>
      {stateLocked ? (
        <section ref={stateNotice} tabIndex={-1} className="operation-outcome" role="status">
          <p>
            {unavailable ? new UnavailableTrip(unavailable).message : t('expenses.stateCheckFirst')}
          </p>
          <p>{unconfirmed ? t('expenses.operationUnknown') : t('expenses.draftKept')}</p>
          <div className="expense-state-actions">
            {unavailable ? (
              <Link to={unavailable.state === 'trash' ? '/trips/trash' : '/trips'}>
                {t(unavailable.state === 'trash' ? 'expenses.restoreTrip' : 'expenses.backTrips')}
              </Link>
            ) : null}
            {!unconfirmed ? (
              <TripOperationCheck
                busy={busy}
                onCheck={checkTripState}
                label={t('expenses.recheckTrip')}
                busyLabel={t('expenses.checkingTrip')}
              />
            ) : null}
          </div>
        </section>
      ) : null}
      {readError ? (
        <p className="error" role="alert">
          {t('expenses.readUpdateFailed')}
        </p>
      ) : null}
      <form
        aria-label={t('expenses.formRegion')}
        className="form-panel expense-form"
        data-command-id={id}
        noValidate
        onSubmit={submit}
      >
        <fieldset disabled={busy || Boolean(unconfirmed) || stateLocked}>
          <div className="field">
            <label htmlFor={itemId}>{t('expenses.item')}</label>
            <Input
              id={itemId}
              ref={itemInput}
              value={item}
              onChange={(event) => setItem(event.target.value)}
              placeholder={t('expenses.itemPlaceholder')}
              aria-invalid={Boolean(errors.item)}
              aria-describedby={errors.item ? `${itemId}-error` : undefined}
              required
            />
            <p id={`${itemId}-error`} className="error">
              {displayError(errors.item)}
            </p>
          </div>
          <div className="expense-money two-col">
            <div className="field">
              <label htmlFor={amountId}>{t('expenses.amount')}</label>
              <Input
                id={amountId}
                ref={amountInput}
                className="money-input"
                inputMode={digits === 0 ? 'numeric' : 'decimal'}
                autoComplete="off"
                placeholder="0"
                value={amount}
                aria-describedby={`${amountId}-hint ${amountId}-error`}
                aria-invalid={Boolean(errors.amount)}
                required
                onChange={(event) => {
                  const next = event.target.value;

                  if (accepted(next) || removesCharacters(next)) {
                    setAmount(next);
                    setErrors((previous) => ({
                      ...previous,
                      amount: accepted(next) ? undefined : 'expenses.amountNewCurrency',
                    }));
                  } else
                    setErrors((previous) => ({
                      ...previous,
                      amount: 'expenses.amountPositive',
                    }));
                }}
                onPaste={(event) => {
                  const input = event.currentTarget;
                  const next =
                    amount.slice(0, input.selectionStart ?? 0) +
                    event.clipboardData.getData('text') +
                    amount.slice(input.selectionEnd ?? amount.length);

                  if (!accepted(next)) {
                    event.preventDefault();
                    setErrors((previous) => ({
                      ...previous,
                      amount: 'expenses.pastedAmountInvalid',
                    }));
                  }
                }}
              />
              <p id={`${amountId}-hint`} className="field-hint">
                {digits === undefined
                  ? t('expenses.chooseCurrencyFirst')
                  : digits
                    ? t('expenses.maxDecimals', { currency, digits })
                    : t('expenses.wholeAmount', { currency })}
              </p>
              <p id={`${amountId}-error`} className="error" role="status">
                {displayError(errors.amount)}
              </p>
            </div>
            <SearchCombo
              label={t('expenses.currency')}
              value={currency}
              options={currencyOptions}
              onSelect={(value) => saveCurrencyPreference(account!.id, tripId, value)}
              onChange={(value) => {
                setCurrency(value);
                const nextPrecision =
                  expense?.currencyCode === value
                    ? expense.minorUnit
                    : currencies.data?.items.find((option) => option.code === value)?.minorUnit;
                const nextDigits = value === 'TWD' ? 0 : nextPrecision;
                const unchanged = expense?.currencyCode === value && expense.amount === amount;
                const incompatible =
                  !unchanged &&
                  value &&
                  amount &&
                  nextDigits !== undefined &&
                  !(
                    nextDigits === 0 ? /^\d*$/ : new RegExp(`^\\d*(?:\\.\\d{0,${nextDigits}})?$`)
                  ).test(amount);

                setErrors((previous) => ({
                  ...previous,
                  currency: undefined,
                  amount: incompatible ? 'expenses.amountNewCurrency' : undefined,
                }));
              }}
              error={displayError(errors.currency)}
              pending={currencies.isPending}
              disabled={Boolean(currencies.error)}
            />
            {currencies.error ? (
              <p className="error" role="alert">
                {t('expenses.currencyLoadFailed')}
                <Button
                  variant="ghost"
                  className="text-btn"
                  type="button"
                  onClick={() => {
                    void currencies.refetch();
                  }}
                >
                  {t('expenses.retryCurrencies')}
                </Button>
              </p>
            ) : null}
          </div>
          <div className="two-col">
            <DateField
              label={t('expenses.expenseDate')}
              value={date}
              onChange={setDate}
              error={displayError(errors.date)}
            />
            <div>
              <SearchCombo
                label={t('expenses.category')}
                value={category}
                options={categoryOptions}
                onChange={setCategory}
                onSelect={(value) => saveCategoryPreference(account!.id, value)}
                optional
                pending={categories.isPending}
                disabled={Boolean(categories.error)}
              />
              {categories.error ? (
                <p className="error" role="alert">
                  {t('expenses.categoryLoadFailed')}
                  <Button
                    variant="ghost"
                    type="button"
                    className="text-btn"
                    onClick={() => {
                      void categories.refetch();
                    }}
                  >
                    {t('expenses.retryCategories')}
                  </Button>
                </p>
              ) : null}
            </div>
          </div>
          <section
            aria-label={t('expenses.sharingMembers')}
            aria-busy={members.isPending || undefined}
            tabIndex={members.isPending ? 0 : -1}
          >
            {members.data ? (
              <div className="expense-sharing">
                <fieldset
                  className="member-picker"
                  aria-describedby={errors.payerMemberId ? `${itemId}-payer-error` : undefined}
                >
                  <legend>{t('expenses.whoPaid')}</legend>
                  <div className="member-choices">
                    {members.data.items
                      .filter((member) => member.isActive || member.id === expense?.payerMemberId)
                      .map((member) => (
                        <label key={member.id} className="member-choice">
                          <input
                            type="radio"
                            name={`${id}-payer`}
                            value={member.id}
                            checked={payerMemberId === member.id}
                            disabled={!member.isActive}
                            onChange={() => setPayerMemberId(member.id)}
                            aria-invalid={Boolean(errors.payerMemberId)}
                          />
                          <span>{member.name}</span>
                        </label>
                      ))}
                  </div>
                  <p id={`${itemId}-payer-error`} className="error" role="alert">
                    {displayError(errors.payerMemberId)}
                  </p>
                </fieldset>
                <fieldset
                  className="member-picker"
                  aria-describedby={errors.shareMemberIds ? `${itemId}-shares-error` : undefined}
                >
                  <legend>{t('expenses.whoShares')}</legend>
                  <div className="member-choices">
                    {members.data.items
                      .filter(
                        (member) =>
                          member.isActive ||
                          expense?.shares.some((share) => share.memberId === member.id),
                      )
                      .map((member) => (
                        <label key={member.id} className="member-choice">
                          <input
                            type="checkbox"
                            value={member.id}
                            checked={shareMemberIds.includes(member.id)}
                            disabled={!member.isActive}
                            onChange={(event) =>
                              setShareMemberIds((previous) =>
                                event.target.checked
                                  ? [...previous, member.id]
                                  : previous.filter((value) => value !== member.id),
                              )
                            }
                            aria-invalid={Boolean(errors.shareMemberIds)}
                          />
                          <span>{member.name}</span>
                        </label>
                      ))}
                  </div>
                  <p id={`${itemId}-shares-error`} className="error" role="alert">
                    {displayError(errors.shareMemberIds)}
                  </p>
                </fieldset>
                <p className="field-hint">{t('expenses.payerMayNotShare')}</p>
                {shareMemberIds.length && precision !== undefined
                  ? (() => {
                      try {
                        const display = `${currency} ${formatShareAmount({ numerator: parseMoney(amount, precision).toString(), denominator: String(shareMemberIds.length), minorUnit: precision })}`;

                        return (
                          <div className="share-preview">
                            <div>
                              {t('expenses.eachShare')}
                              <p className="field-hint">
                                {members.data.items
                                  .filter((member) => shareMemberIds.includes(member.id))
                                  .map((member) => member.name)
                                  .join(t('expenses.nameSeparator'))}
                              </p>
                            </div>
                            <output aria-label={display}>{display}</output>
                          </div>
                        );
                      } catch {
                        return null;
                      }
                    })()
                  : null}
                {expense && !stateLocked ? (
                  <ExpenseShares expense={expense} members={members.data.items} />
                ) : null}
              </div>
            ) : (
              <>
                {members.isPending ? (
                  <BusyIndicator accessibleLabel={t('expenses.readingMembers')} />
                ) : (
                  <QueryState
                    error={members.error}
                    retry={() => {
                      void members.refetch();
                    }}
                  />
                )}
              </>
            )}
          </section>
        </fieldset>
        <p className="error" role="alert">
          {displayError(saveError)}
        </p>
        {unconfirmed && !deleting ? (
          <TripOperationCheck
            busy={busy}
            onCheck={recheck}
            label={t('expenses.checkAgain')}
            busyLabel={t('expenses.checkingOperation')}
          />
        ) : null}
        <div className="form-actions">
          {expense ? (
            <Button
              variant="ghost"
              className="text-btn danger delete-expense"
              type="button"
              disabled={busy || Boolean(unconfirmed) || stateLocked}
              onClick={() => {
                setSaveError('');
                setDeleting(true);
              }}
            >
              {t('expenses.deleteExpense')}
            </Button>
          ) : null}
          <Button asChild variant="outline">
            <Link
              aria-disabled={busy}
              onClick={(event) => {
                if (busy) event.preventDefault();
                else if (!unconfirmed)
                  client.removeQueries({
                    queryKey: expenseDraftKey(account!.id, tripId),
                    exact: true,
                  });
              }}
              to={`/trips/${tripId}`}
            >
              {t('expenses.cancel')}
            </Link>
          </Button>
          <ActionButton
            busy={busy}
            label={t('expenses.saveExpense')}
            variant="default"
            disabled={
              busy ||
              Boolean(unconfirmed) ||
              stateLocked ||
              awaitingPreference ||
              members.isPending ||
              Boolean(members.error) ||
              currencies.isPending ||
              Boolean(currencies.error) ||
              categories.isPending ||
              Boolean(categories.error)
            }
          />
        </div>
      </form>
      {deleting && expense && !unavailable ? (
        <FormDialog
          title={t('expenses.deleteTitle')}
          onClose={() => setDeleting(false)}
          busy={busy}
        >
          <p>
            {t('expenses.deleteDescription', {
              item: expense.item,
              currency: expense.currencyCode,
              amount: displayAmount(expense.amount),
            })}
          </p>
          <p className="error" role="alert">
            {displayError(saveError)}
          </p>
          {unconfirmed ? (
            <TripOperationCheck
              busy={busy}
              onCheck={recheck}
              label={t('expenses.checkAgain')}
              busyLabel={t('expenses.checkingOperation')}
            />
          ) : null}
          <div className="form-actions">
            <Button
              variant="outline"
              type="button"
              disabled={busy}
              onClick={() => setDeleting(false)}
            >
              {t('expenses.cancel')}
            </Button>
            <ActionButton
              busy={busy}
              label={t('expenses.confirmDelete')}
              variant="destructive"
              type="button"
              disabled={busy || Boolean(unconfirmed) || stateLocked}
              onClick={() => {
                if (!writing.current && !unconfirmed && !stateLocked) {
                  writing.current = true;
                  deletion.mutate();
                }
              }}
            />
          </div>
        </FormDialog>
      ) : null}
    </>
  );
}
