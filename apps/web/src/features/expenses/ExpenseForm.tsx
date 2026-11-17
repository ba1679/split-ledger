import { Input } from '../../components/ui/input.js';
import { Button } from '../../components/ui/button.js';
import React, { useEffect, useId, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { parseMoney } from '@split-ledger/shared';
import { expenseDraftKey, type RetainedExpenseDraft } from './expense-draft.js';
import {
  apiRequest,
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
import { SearchCombo } from '../../components/SearchCombo.js';
import { FormDialog } from '../../components/FormDialog.js';
import { useSession } from '../auth/session.js';
import { displayAmount } from './money.js';
import { ExpenseShares, formatShareAmount } from './ExpenseShares.js';
import {
  definitelyRejected,
  OfflineWrite,
  UnconfirmedWrite,
  unconfirmedMessage,
  verifiedDelete,
  verifiedSave,
  type SaveIntent,
  type WriteIntent,
} from './save-outcome.js';
import { readCategoryPreference, saveCategoryPreference } from '../categories/preference.js';
import { Icon } from '../../components/Icon.js';
import { readCurrencyPreference, saveCurrencyPreference } from './currency-preference.js';

type FieldErrors = Partial<
  Record<'item' | 'currency' | 'amount' | 'date' | 'payerMemberId' | 'shareMemberIds', string>
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
          <span>返回旅行帳本</span>
        </Link>
        <QueryState
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
    [saveError, setSaveError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [unconfirmed, setUnconfirmed] = useState<WriteIntent | null>(null);
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
      digits !== undefined &&
      value.length <= 25 &&
      (digits === 0 ? /^\d*$/ : new RegExp(`^\\d*(?:\\.\\d{0,${digits}})?$`)).test(value)
    );
  }

  function removesCharacters(next: string) {
    if (next.length >= amount.length || accepted(amount)) return false;

    let index = 0;
    while (index < next.length && amount[index] === next[index]) index++;

    return amount.slice(index + amount.length - next.length) === next.slice(index);
  }

  const currencyOptions =
    currencies.data?.items.map((option) => ({
      value: option.code,
      label: `${option.code} · ${option.name}`,
    })) ?? [];

  if (expense && !currencyOptions.some((option) => option.value === expense.currencyCode))
    currencyOptions.push({
      value: expense.currencyCode,
      label: `${expense.currencyCode} · 已保存幣別`,
    });

  async function saved(message: string) {
    client.removeQueries({ queryKey: expenseDraftKey(account!.id, tripId), exact: true });
    await Promise.all(
      [
        'trip',
        'trips',
        'expense',
        'expenses',
        'totals',
        'categories',
        'settlement',
        'repayments',
      ].map((resource) =>
        client.invalidateQueries({ queryKey: ['account', account!.id, resource] }),
      ),
    );
    navigate(`/trips/${tripId}`, { state: { message } });
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
        if (definitelyRejected(error)) throw error;
        // The original UUID is queried after an unavailable response; no mutation is retried.
        const confirmed = await verifiedSave(intent);

        if (confirmed) return confirmed;

        throw new UnconfirmedWrite(intent, error);
      }
    },
    onSuccess: () => saved('支出已保存'),
    onError: (error) => {
      setSaveError(error.message);
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
          setErrors((previous) => ({ ...previous, [field]: error.message }));
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

        if (await verifiedDelete(intent)) return;

        throw new UnconfirmedWrite(intent, error);
      }
    },
    onSuccess: () => saved('支出已刪除'),
    onError: (error) => {
      setSaveError(error.message);
      if (error instanceof UnconfirmedWrite) setUnconfirmed(error.intent);
    },
    onSettled: () => {
      writing.current = false;
    },
  });

  const verification = useMutation({
    mutationFn: async (intent: WriteIntent) =>
      intent.kind === 'save' ? Boolean(await verifiedSave(intent)) : verifiedDelete(intent),
    onSuccess: async (confirmed, intent) => {
      if (confirmed) {
        await saved(intent.kind === 'save' ? '支出已保存' : '支出已刪除');
      } else setSaveError(unconfirmedMessage(intent.kind));
    },
    onSettled: () => {
      writing.current = false;
    },
  });

  const busy = mutation.isPending || deletion.isPending || verification.isPending;
  const categoryOptions = [
    { value: '', label: '未分類' },
    ...(categories.data?.items.map((option) => ({ value: option.id, label: option.name })) ?? []),
  ];

  if (
    (busy || unconfirmed) &&
    submittedCategory &&
    !categoryOptions.some((option) => option.value === submittedCategory.value)
  )
    categoryOptions.push(submittedCategory);

  function recheck() {
    if (unconfirmed && !writing.current) {
      writing.current = true;
      verification.mutate(unconfirmed);
    }
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (writing.current || unconfirmed || awaitingPreference) return;

    const validation: FieldErrors = {};

    if (!item.trim()) validation.item = '請填寫支出項目。';
    if (precision === undefined || currencies.error) validation.currency = '請從可用目錄選擇幣別。';

    try {
      if (precision === undefined) throw new RangeError();
      if (!expense || amount !== expense.amount || currency !== expense.currencyCode)
        parseMoney(amount, precision, currency);
    } catch {
      validation.amount = '請輸入符合幣別位數且大於零的正數金額。';
    }
    if (!payerMemberId) validation.payerMemberId = '請選擇付款人。';
    if (!shareMemberIds.length) validation.shareMemberIds = '請至少選擇一位分攤者。';
    const parsed = parseDate(date);

    if (!parsed) validation.date = '請輸入有效的支出日期，例如 2027/03/11。';

    setErrors(validation);
    setSaveError('');
    if (Object.keys(validation).length) {
      if (validation.item) itemInput.current?.focus();
      else if (validation.amount) amountInput.current?.focus();

      return;
    }
    if (!navigator.onLine) {
      setSaveError('目前無法連線，這筆支出尚未保存。請保留畫面並在連線後再試。');

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
          <h1>{expense ? '編輯這筆花費' : '記下這筆花費'}</h1>
          <p className="muted">
            {expense ? '修正紀錄，讓帳本更準確。' : '先記錄誰付了錢，再選這筆要由誰平均分攤。'}
          </p>
        </div>
      </header>
      {readError ? (
        <p className="error" role="alert">
          暫時無法更新已保存資料，請保留草稿後再試。
        </p>
      ) : null}
      <form className="form-panel expense-form" data-command-id={id} noValidate onSubmit={submit}>
        <fieldset disabled={busy || Boolean(unconfirmed)}>
          <div className="field">
            <label htmlFor={itemId}>支出項目</label>
            <Input
              id={itemId}
              ref={itemInput}
              value={item}
              onChange={(event) => setItem(event.target.value)}
              placeholder="例如：巷口的拉麵店"
              aria-invalid={Boolean(errors.item)}
              aria-describedby={errors.item ? `${itemId}-error` : undefined}
              required
            />
            <p id={`${itemId}-error`} className="error">
              {errors.item}
            </p>
          </div>
          <div className="expense-money two-col">
            <div className="field">
              <label htmlFor={amountId}>金額</label>
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
                      amount: accepted(next)
                        ? undefined
                        : '目前金額不符合新幣別的小數位數，請手動修正。',
                    }));
                  } else
                    setErrors((previous) => ({
                      ...previous,
                      amount: '請輸入符合幣別位數的正數金額。',
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
                      amount: '貼上的金額不符合幣別位數，已保留原值。',
                    }));
                  }
                }}
              />
              <p id={`${amountId}-hint`} className="field-hint">
                {digits === undefined
                  ? '請先選擇幣別。'
                  : digits
                    ? `${currency} 最多 ${digits} 位小數`
                    : `${currency} 使用整數金額`}
              </p>
              <p id={`${amountId}-error`} className="error" role="status">
                {errors.amount}
              </p>
            </div>
            <SearchCombo
              label="幣別"
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
                  amount: incompatible ? '目前金額不符合新幣別的小數位數，請手動修正。' : undefined,
                }));
              }}
              error={errors.currency}
              disabled={currencies.isPending || Boolean(currencies.error)}
            />
            {currencies.error ? (
              <p className="error" role="alert">
                無法取得幣別目錄，請保留草稿。
                <Button
                  variant="ghost"
                  className="text-btn"
                  type="button"
                  onClick={() => {
                    void currencies.refetch();
                  }}
                >
                  重新取得幣別
                </Button>
              </p>
            ) : null}
          </div>
          <div className="two-col">
            <DateField label="支出日期" value={date} onChange={setDate} error={errors.date} />
            <div>
              <SearchCombo
                label="分類"
                value={category}
                options={categoryOptions}
                onChange={setCategory}
                onSelect={(value) => saveCategoryPreference(account!.id, value)}
                optional
                disabled={categories.isPending || Boolean(categories.error)}
              />
              {categories.error ? (
                <p className="error" role="alert">
                  暫時無法取得分類。
                  <Button
                    variant="ghost"
                    type="button"
                    className="text-btn"
                    onClick={() => {
                      void categories.refetch();
                    }}
                  >
                    重新取得分類
                  </Button>
                </p>
              ) : null}
            </div>
          </div>
          {members.data ? (
            <div className="expense-sharing">
              <fieldset
                className="member-picker"
                aria-describedby={errors.payerMemberId ? `${itemId}-payer-error` : undefined}
              >
                <legend>誰付款？</legend>
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
                  {errors.payerMemberId}
                </p>
              </fieldset>
              <fieldset
                className="member-picker"
                aria-describedby={errors.shareMemberIds ? `${itemId}-shares-error` : undefined}
              >
                <legend>誰一起平均分攤？</legend>
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
                  {errors.shareMemberIds}
                </p>
              </fieldset>
              <p className="field-hint">付款人可以不參與分攤。</p>
              {shareMemberIds.length && precision !== undefined
                ? (() => {
                    try {
                      const display = `${currency} ${formatShareAmount({ numerator: parseMoney(amount, precision).toString(), denominator: String(shareMemberIds.length), minorUnit: precision })}`;

                      return (
                        <div className="share-preview">
                          <div>
                            每人分攤
                            <p className="field-hint">
                              {members.data.items
                                .filter((member) => shareMemberIds.includes(member.id))
                                .map((member) => member.name)
                                .join('、')}
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
              {expense ? <ExpenseShares expense={expense} members={members.data.items} /> : null}
            </div>
          ) : (
            <QueryState
              pending={members.isPending}
              error={members.error}
              retry={() => {
                void members.refetch();
              }}
            />
          )}
        </fieldset>
        <p className="error" role="alert">
          {saveError}
        </p>
        {unconfirmed && !deleting ? (
          <Button variant="outline" type="button" disabled={busy} onClick={recheck}>
            {verification.isPending ? '查證中…' : '重新查證'}
          </Button>
        ) : null}
        <div className="form-actions">
          {expense ? (
            <Button
              variant="ghost"
              className="text-btn danger delete-expense"
              type="button"
              disabled={busy || Boolean(unconfirmed)}
              onClick={() => {
                setSaveError('');
                setDeleting(true);
              }}
            >
              刪除支出
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
              取消
            </Link>
          </Button>
          <Button
            variant="default"
            disabled={
              busy ||
              Boolean(unconfirmed) ||
              awaitingPreference ||
              members.isPending ||
              Boolean(members.error) ||
              currencies.isPending ||
              Boolean(currencies.error)
            }
          >
            {mutation.isPending ? '儲存中…' : '儲存支出'}
          </Button>
        </div>
      </form>
      {deleting && expense ? (
        <FormDialog title="刪除這筆支出？" onClose={() => setDeleting(false)} busy={busy}>
          <p>
            確定刪除「{expense.item}」{expense.currencyCode} {displayAmount(expense.amount)}
            ？此操作無法復原。
          </p>
          <p className="error" role="alert">
            {saveError}
          </p>
          {unconfirmed ? (
            <Button variant="outline" type="button" disabled={busy} onClick={recheck}>
              {verification.isPending ? '查證中…' : '重新查證'}
            </Button>
          ) : null}
          <div className="form-actions">
            <Button
              variant="outline"
              type="button"
              disabled={busy}
              onClick={() => setDeleting(false)}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              type="button"
              disabled={busy || Boolean(unconfirmed)}
              onClick={() => {
                if (!writing.current && !unconfirmed) {
                  writing.current = true;
                  deletion.mutate();
                }
              }}
            >
              {deletion.isPending ? '刪除中…' : '確認刪除'}
            </Button>
          </div>
        </FormDialog>
      ) : null}
    </>
  );
}
