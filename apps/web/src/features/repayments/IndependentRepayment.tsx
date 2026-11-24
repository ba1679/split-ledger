import { MobileLanguageBar } from '../../components/LanguageMenu.js';
import { useTranslation } from 'react-i18next';
import { currencyOption } from '../../i18n/currency-options.js';
import React, { useId, useRef, useState, useSyncExternalStore } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { parseMoney, type ExactAmount } from '@split-ledger/shared';
import {
  apiRequest,
  apiErrorMessage,
  ApiError,
  type Trip,
  type TripMember,
  type ItemList,
  type CurrencyList,
} from '../../api/index.js';
import { useSession } from '../auth/session.js';
import { formatShareAmount } from '../expenses/ExpenseShares.js';
import type { SettlementView } from '../settlement/types.js';
import type { CreateRepaymentRequest, OverpaymentConfirmation, Repayment } from './types.js';
import { Button } from '../../components/ui/button.js';
import { ActionButton } from '../../components/waiting/ActionButton.js';
import { Input } from '../../components/ui/input.js';
import { Select } from '../../components/ui/select.js';
import { DateField } from '../../components/DateField.js';
import { dateOnly, localToday, parseDate } from '../../components/date.js';
import { QueryState } from '../../components/QueryState.js';
import { SearchCombo } from '../../components/SearchCombo.js';
import { Icon } from '../../components/Icon.js';
import { registerInterfaceMessages } from '../../i18n/runtime.js';
import './repayment.css';

registerInterfaceMessages('repaymentForm', {
  label: ['還款表單', 'Separate payment form'],
  saved: ['還款已儲存', 'Payment recorded'],
  partiesRequired: [
    '請選擇本旅行啟用中的付款人與收款人。',
    'Select an active payer and recipient on this trip.',
  ],
  sameParty: ['付款人與收款人不可相同。', 'Payer and recipient must be different.'],
  currencyRequired: ['請選擇有效幣別。', 'Select a valid currency.'],
  amountInvalid: [
    '請輸入符合幣別位數的正數金額。',
    'Enter a positive amount paid with valid currency precision.',
  ],
  dateInvalid: ['請輸入有效日期（YYYY/MM/DD）。', 'Enter a valid date (YYYY/MM/DD).'],
  title: ['記錄一筆實際還款', 'Record a separate payment'],
  intro: [
    '可先付一部分，也可以分次記錄。',
    'Record a payment without selecting a payment arrangement.',
  ],
  due: ['目前應付', 'Amount due'],
  lastConfirmed: ['目前應付（上次已確認）', 'Amount due (last confirmed)'],
  selectParties: [
    '選擇付款人與收款人，查看目前安排。',
    'Select a payer and recipient to see the current arrangement.',
  ],
  contents: ['還款內容', 'Payment details'],
  payer: ['付款人', 'Payer'],
  payee: ['收款人', 'Recipient'],
  choosePayer: ['選擇付款人', 'Select payer'],
  choosePayee: ['選擇收款人', 'Select recipient'],
  amount: ['金額', 'Amount paid'],
  currency: ['幣別', 'Currency'],
  date: ['還款日期', 'Payment date'],
  remaining: [
    '這次記錄後，將剩餘 {{currency}} {{amount}}。',
    'After this payment, {{currency}} {{amount}} will remain due.',
  ],
  overHint: [
    '還款超過目前應付時，會先告知結果，確認後才保存。',
    'If the payment exceeds the amount due, review the result before saving.',
  ],
  onlyCurrency: [
    '只更新 {{currency}} 的付款安排，其他幣別不變。',
    'Only {{currency}} payment arrangements will change; other currencies stay the same.',
  ],
  overConfirm: ['超額確認', 'Overpayment confirmation'],
  overTitle: ['這筆還款超過應付額', 'This payment exceeds the amount due'],
  changedTitle: ['付款安排已更新', 'Payment arrangements have changed'],
  excess: [
    '超額 {{currency}} {{amount}}，尚未保存。',
    'Excess {{currency}} {{amount}} has not been saved.',
  ],
  reverseDue: [
    '{{payer}} 應付 {{payee}} {{currency}} {{amount}}',
    '{{payer}} owes {{payee}} {{currency}} {{amount}}',
  ],
  reviewDue: [
    '尚未保存，請確認更新後的應付金額。',
    'Not saved yet. Review the updated amount due.',
  ],
  changedHint: [
    '帳本已有變更，請再次確認；如仍超額，會重新取得警告並請你確認。',
    'The ledger has changed. Review again; if the amount still exceeds what is due, confirm the new warning.',
  ],
  confirm: ['確認儲存還款', 'Confirm payment'],
  cancel: ['取消', 'Cancel'],
  returnConfirmed: ['返回已確認資料', 'Return to confirmed data'],
  save: ['儲存還款', 'Save payment'],
});

type PaymentDraft = Omit<CreateRepaymentRequest, 'overpaymentConfirmation'>;
type Verification = { draft: PaymentDraft; status: 'unconfirmed' | 'unknown' };
type Errors = Partial<Record<'parties' | 'amount' | 'currency' | 'date', string>>;

function remainingAfter(
  due: ExactAmount,
  amount: string,
  precision: number,
  currency: string,
): ExactAmount {
  const paid = parseMoney(amount, precision, currency);

  return {
    numerator: (
      BigInt(due.numerator) * 10n ** BigInt(precision) -
      paid * BigInt(due.denominator) * 10n ** BigInt(due.minorUnit)
    ).toString(),
    denominator: (BigInt(due.denominator) * 10n ** BigInt(precision)).toString(),
    minorUnit: due.minorUnit,
  };
}

/** Compare the original cash fact at its stored scale, never its rounded display. */
function matchesPayment(saved: Repayment, draft: PaymentDraft, tripId: string) {
  try {
    return (
      saved.id === draft.id &&
      saved.tripId === tripId &&
      saved.payerMemberId === draft.payerMemberId &&
      saved.payeeMemberId === draft.payeeMemberId &&
      saved.currencyCode === draft.currencyCode &&
      saved.paidOn === draft.paidOn &&
      saved.kind === 'independent' &&
      saved.settlementId === null &&
      parseMoney(saved.amount, saved.minorUnit) ===
        parseMoney(draft.amount, saved.minorUnit, draft.currencyCode)
    );
  } catch {
    return false;
  }
}

export function IndependentRepayment() {
  const { t } = useTranslation();
  const { tripId } = useParams();
  const { account } = useSession();
  const base = `/api/trips/${tripId}`;
  const query = useQuery({
    queryKey: ['account', account!.id, 'repayments', tripId, 'form'],
    queryFn: async ({ signal }) => {
      const [trip, members, currencies, settlement] = await Promise.all([
        apiRequest<Trip>(base, { signal }),
        apiRequest<ItemList<TripMember>>(`${base}/members`, { signal }),
        apiRequest<CurrencyList>('/api/currencies', { signal }),
        apiRequest<SettlementView>(`${base}/settlement`, { signal }),
      ]);

      return { trip, members: members.items, currencies, settlement };
    },
  });

  if (!query.data)
    return (
      <QueryState
        label={t('repaymentForm.label')}
        layout="form"
        fetchStatus={query.fetchStatus}
        pending={query.isPending}
        error={query.error}
        retry={() => {
          void query.refetch();
        }}
      />
    );

  return <RepaymentEditor key={`${account!.id}:${tripId}`} {...query.data} />;
}

function subscribeOnline(notify: () => void) {
  window.addEventListener('online', notify);
  window.addEventListener('offline', notify);

  return () => {
    window.removeEventListener('online', notify);
    window.removeEventListener('offline', notify);
  };
}

function RepaymentEditor({
  trip,
  members,
  currencies,
  settlement: initialSettlement,
}: {
  trip: Trip;
  members: TripMember[];
  currencies: CurrencyList;
  settlement: SettlementView;
}) {
  const { account } = useSession();
  const { t, i18n } = useTranslation();
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine);
  const navigate = useNavigate();
  const client = useQueryClient();
  const base = `/api/trips/${trip.id}`;
  const [id] = useState(() => crypto.randomUUID());
  const [payer, setPayer] = useState(trip.ownerMemberId);
  const [payee, setPayee] = useState('');
  const [currency, setCurrency] = useState('JPY');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => dateOnly(localToday()).replaceAll('-', '/'));
  const [settlement, setSettlement] = useState(initialSettlement);
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<ApiError | 'revisionConflict' | null>(null);
  const [warning, setWarning] = useState<{
    draft: PaymentDraft;
    confirmation?: OverpaymentConfirmation;
    excessAmount: ExactAmount | null;
    reverseDebtorMemberId: string;
    reverseCreditorMemberId: string;
  } | null>(null);
  const [unknown, setUnknown] = useState<Verification | null>(null);
  const [saving, setSaving] = useState(false);
  const writing = useRef(false);
  const payerId = useId(),
    payeeId = useId(),
    amountId = useId();
  const active = members.filter((member) => member.isActive);
  const names = new Map(members.map((member) => [member.id, member.name]));
  const precision = currencies.items.find((entry) => entry.code === currency)?.minorUnit;
  const due = settlement.arrangements.find(
    (entry) =>
      entry.debtorMemberId === payer &&
      entry.creditorMemberId === payee &&
      entry.currencyCode === currency,
  )?.amount;
  let remaining: ExactAmount | null = null;
  try {
    if (due && precision !== undefined) {
      remaining = remainingAfter(due, amount, precision, currency);
    }
  } catch {
    /* Invalid input has no projected balance. */
  }

  async function saved() {
    await Promise.all(
      ['trip', 'trips', 'settlement', 'repayments'].map((resource) =>
        client.invalidateQueries({ queryKey: ['account', account!.id, resource] }),
      ),
    );
    navigate(`/trips/${trip.id}/settlement`, { state: { messageKey: 'repaymentForm.saved' } });
  }

  async function verify(draft: PaymentDraft) {
    let status: Verification['status'] = 'unknown';
    try {
      const result = await apiRequest<Repayment>(`${base}/repayments/${draft.id}`);
      if (matchesPayment(result, draft, trip.id)) {
        await saved();

        return;
      }
    } catch (error) {
      // A reachable server without a matching record cannot prove the original save failed.
      if (error instanceof ApiError && error.status === 404) status = 'unconfirmed';
    }
    setUnknown({ draft, status });
  }

  async function submit(draft: PaymentDraft, confirmation?: OverpaymentConfirmation) {
    try {
      const result = await apiRequest<Repayment>(`${base}/repayments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          confirmation ? { ...draft, overpaymentConfirmation: confirmation } : draft,
        ),
      });
      if (!matchesPayment(result, draft, trip.id)) {
        setWarning(null);
        setUnknown({ draft, status: 'unknown' });
        await verify(draft);

        return;
      }
      await saved();
    } catch (error) {
      if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
        if (error.code === 'OVERPAYMENT_CONFIRMATION_REQUIRED' && error.confirmation) {
          setWarning({ draft, ...error.confirmation, confirmation: error.confirmation });
        } else if (confirmation && error.code === 'ACCOUNTING_REVISION_CONFLICT') {
          setWarning(null);
          try {
            const current = await apiRequest<SettlementView>(`${base}/settlement`);
            setSettlement(current);
            const currentDue = current.arrangements.find(
              (entry) =>
                entry.debtorMemberId === draft.payerMemberId &&
                entry.creditorMemberId === draft.payeeMemberId &&
                entry.currencyCode === draft.currencyCode,
            )?.amount ?? { numerator: '0', denominator: '1', minorUnit: 0 };
            const nextRemaining = remainingAfter(
              currentDue,
              draft.amount,
              precision!,
              draft.currencyCode,
            );
            // This is a preview, without a token. A fresh user action must obtain a new
            // server warning before another explicit confirmation can attach its snapshot.
            setWarning({
              draft,
              excessAmount:
                BigInt(nextRemaining.numerator) < 0n
                  ? { ...nextRemaining, numerator: (-BigInt(nextRemaining.numerator)).toString() }
                  : null,
              reverseDebtorMemberId: draft.payeeMemberId,
              reverseCreditorMemberId: draft.payerMemberId,
            });
          } catch {
            setFailure('revisionConflict');
          }
        } else {
          setFailure(error.code === 'ACCOUNTING_REVISION_CONFLICT' ? 'revisionConflict' : error);
        }
      } else {
        setWarning(null);
        setUnknown({ draft, status: 'unknown' });
        await verify(draft);
      }
    }
  }

  async function save(confirm = false) {
    if (writing.current || unknown || (warning && !confirm)) return;
    const next: Errors = {};
    if (
      !active.some((member) => member.id === payer) ||
      !active.some((member) => member.id === payee)
    )
      next.parties = 'repaymentForm.partiesRequired';
    else if (payer === payee) next.parties = 'repaymentForm.sameParty';
    if (precision === undefined) next.currency = 'repaymentForm.currencyRequired';
    else
      try {
        parseMoney(amount, precision, currency);
      } catch {
        next.amount = 'repaymentForm.amountInvalid';
      }
    const parsedDate = parseDate(date);
    if (!parsedDate) next.date = 'repaymentForm.dateInvalid';
    setErrors(next);
    if (Object.keys(next).length) return;
    const draft = warning?.draft ?? {
      id,
      payerMemberId: payer,
      payeeMemberId: payee,
      currencyCode: currency,
      amount,
      paidOn: dateOnly(parsedDate!),
    };
    writing.current = true;
    setSaving(true);
    setFailure(null);
    try {
      await submit(draft, confirm ? warning?.confirmation : undefined);
    } finally {
      writing.current = false;
      setSaving(false);
    }
  }

  return (
    <div className="repayment-page">
      <MobileLanguageBar>
        <Link className="back" to={`/trips/${trip.id}/settlement`}>
          <Icon name="back" />
          <span>{trip.name}</span>
        </Link>
      </MobileLanguageBar>
      <header className="page-head">
        <div>
          <h1>{t('repaymentForm.title')}</h1>
          <p className="muted">{t('repaymentForm.intro')}</p>
        </div>
      </header>
      <section className="repayment-due" aria-label={t('repaymentForm.due')}>
        <p>{t(unknown ? 'repaymentForm.lastConfirmed' : 'repaymentForm.due')}</p>
        <strong>
          {payer && payee
            ? `${names.get(payer)} → ${names.get(payee)} / ${currency} ${due ? formatShareAmount(due) : '0'}`
            : t('repaymentForm.selectParties')}
        </strong>
      </section>
      <form
        aria-label={t('repaymentForm.label')}
        noValidate
        data-command-id={id}
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <fieldset disabled={saving || Boolean(unknown) || Boolean(warning)}>
          <legend className="sr-only">{t('repaymentForm.contents')}</legend>
          <div className="repayment-parties">
            <div className="field">
              <label htmlFor={payerId}>{t('repaymentForm.payer')}</label>
              <Select
                className="ds-input"
                id={payerId}
                value={payer}
                onChange={(event) => setPayer(event.target.value)}
                aria-invalid={Boolean(errors.parties)}
                aria-describedby={`${payerId}-error`}
              >
                <option value="">{t('repaymentForm.choosePayer')}</option>
                {active.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="field">
              <label htmlFor={payeeId}>{t('repaymentForm.payee')}</label>
              <Select
                className="ds-input"
                id={payeeId}
                value={payee}
                onChange={(event) => setPayee(event.target.value)}
                aria-invalid={Boolean(errors.parties)}
                aria-describedby={`${payerId}-error`}
              >
                <option value="">{t('repaymentForm.choosePayee')}</option>
                {active.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          {errors.parties ? (
            <p className="error" role="alert" id={`${payerId}-error`}>
              {errors.parties && t(errors.parties)}
            </p>
          ) : null}
          <div className="repayment-money">
            <div className="field">
              <label htmlFor={amountId}>{t('repaymentForm.amount')}</label>
              <Input
                id={amountId}
                value={amount}
                inputMode="decimal"
                onChange={(event) => setAmount(event.target.value)}
                aria-invalid={Boolean(errors.amount)}
                aria-describedby={`${amountId}-error`}
              />
              <p className="error" role="alert" id={`${amountId}-error`}>
                {errors.amount && t(errors.amount)}
              </p>
            </div>
            <SearchCombo
              label={t('repaymentForm.currency')}
              value={currency}
              options={currencies.items.map((entry) =>
                currencyOption(entry, i18n.resolvedLanguage),
              )}
              onChange={setCurrency}
              error={errors.currency && t(errors.currency)}
            />
          </div>
          <DateField
            label={t('repaymentForm.date')}
            value={date}
            onChange={setDate}
            error={errors.date && t(errors.date)}
          />
        </fieldset>
        {remaining && !unknown ? (
          <section className="repayment-preview">
            <p>
              {BigInt(remaining.numerator) >= 0n
                ? t('repaymentForm.remaining', { currency, amount: formatShareAmount(remaining) })
                : t('repaymentForm.overHint')}
            </p>
            <p className="muted">{t('repaymentForm.onlyCurrency', { currency })}</p>
          </section>
        ) : null}
        {failure ? (
          <p role="alert" className="error">
            {failure === 'revisionConflict'
              ? t('repayment.revisionConflict')
              : apiErrorMessage(failure)}
          </p>
        ) : null}
        {warning ? (
          <section
            className="repayment-warning"
            aria-label={t('repaymentForm.overConfirm')}
            role="alert"
          >
            <h2>
              {t(warning.excessAmount ? 'repaymentForm.overTitle' : 'repaymentForm.changedTitle')}
            </h2>
            {warning.excessAmount ? (
              <>
                <p>
                  {t('repaymentForm.excess', {
                    currency: warning.draft.currencyCode,
                    amount: formatShareAmount(warning.excessAmount),
                  })}
                </p>
                <p>
                  {t('repaymentForm.reverseDue', {
                    payer: names.get(warning.reverseDebtorMemberId),
                    payee: names.get(warning.reverseCreditorMemberId),
                    currency: warning.draft.currencyCode,
                    amount: formatShareAmount(warning.excessAmount),
                  })}
                </p>
              </>
            ) : (
              <p>{t('repaymentForm.reviewDue')}</p>
            )}
            {!warning.confirmation ? <p>{t('repaymentForm.changedHint')}</p> : null}
            <div className="repayment-actions">
              <Button
                type="button"
                disabled={saving}
                onClick={() => {
                  void save(true);
                }}
              >
                {t('repaymentForm.confirm')}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => setWarning(null)}
              >
                {t('repaymentForm.cancel')}
              </Button>
            </div>
          </section>
        ) : null}
        {unknown ? (
          <section className="repayment-warning" role="status">
            <h2>
              {t(
                online && unknown.status === 'unconfirmed'
                  ? 'repayment.unconfirmedResult'
                  : 'repayment.unknownResult',
              )}
            </h2>
            <p>{t('repayment.pendingHelp')}</p>
            {!online ? <p>{t('repayment.offlineHelp')}</p> : null}
            <div className="repayment-actions">
              <Button
                type="button"
                disabled={saving}
                onClick={() => {
                  if (writing.current) return;
                  writing.current = true;
                  setSaving(true);
                  void verify(unknown.draft).finally(() => {
                    writing.current = false;
                    setSaving(false);
                  });
                }}
              >
                {t('repayment.checkResult')}
              </Button>
              <Button asChild variant="outline">
                <Link to={`/trips/${trip.id}/settlement`}>
                  {t('repaymentForm.returnConfirmed')}
                </Link>
              </Button>
            </div>
          </section>
        ) : null}
        <div className="repayment-actions">
          <ActionButton
            busy={saving}
            label={t('repaymentForm.save')}
            type="submit"
            disabled={saving || Boolean(unknown) || Boolean(warning)}
          />
        </div>
      </form>
      <p className="muted">{t('repaymentForm.overHint')}</p>
    </div>
  );
}
