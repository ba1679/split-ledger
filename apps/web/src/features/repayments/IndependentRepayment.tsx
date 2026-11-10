import React, { useId, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { parseMoney, type ExactAmount } from '@split-ledger/shared';
import {
  apiRequest,
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
import { Input } from '../../components/ui/input.js';
import { Select } from '../../components/ui/select.js';
import { DateField } from '../../components/DateField.js';
import { dateOnly, localToday, parseDate } from '../../components/date.js';
import { QueryState } from '../../components/QueryState.js';
import { SearchCombo } from '../../components/SearchCombo.js';
import { Icon } from '../../components/Icon.js';
import './repayment.css';

type PaymentDraft = Omit<CreateRepaymentRequest, 'overpaymentConfirmation'>;
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
        pending={query.isPending}
        error={query.error}
        retry={() => {
          void query.refetch();
        }}
      />
    );

  return <RepaymentEditor key={`${account!.id}:${tripId}`} {...query.data} />;
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
  const [failure, setFailure] = useState('');
  const [warning, setWarning] = useState<{
    draft: PaymentDraft;
    confirmation?: OverpaymentConfirmation;
    excessAmount: ExactAmount | null;
    reverseDebtorMemberId: string;
    reverseCreditorMemberId: string;
  } | null>(null);
  const [unknown, setUnknown] = useState<PaymentDraft | null>(null);
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
    navigate(`/trips/${trip.id}/settlement`, { state: { message: '還款已儲存' } });
  }

  async function verify(draft: PaymentDraft) {
    try {
      const result = await apiRequest<Repayment>(`${base}/repayments/${draft.id}`);
      if (matchesPayment(result, draft, trip.id)) {
        await saved();

        return;
      }
    } catch {
      /* Even 404 cannot establish whether the original POST committed. */
    }
    setUnknown(draft);
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
        setUnknown(draft);
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
            setFailure('付款安排已更新，請重新載入後再確認。');
          }
        } else setFailure(error.message);
      } else {
        setWarning(null);
        setUnknown(draft);
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
      next.parties = '請選擇本旅行啟用中的付款人與收款人。';
    else if (payer === payee) next.parties = '付款人與收款人不可相同。';
    if (precision === undefined) next.currency = '請選擇有效幣別。';
    else
      try {
        parseMoney(amount, precision, currency);
      } catch {
        next.amount = '請輸入符合幣別位數的正數金額。';
      }
    const parsedDate = parseDate(date);
    if (!parsedDate) next.date = '請輸入有效日期（YYYY/MM/DD）。';
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
    setFailure('');
    try {
      await submit(draft, confirm ? warning?.confirmation : undefined);
    } finally {
      writing.current = false;
      setSaving(false);
    }
  }

  return (
    <div className="repayment-page">
      <Link className="back" to={`/trips/${trip.id}/settlement`}>
        <Icon name="back" />
        <span>{trip.name}</span>
      </Link>
      <header className="page-head">
        <div>
          <h1>記錄一筆實際還款</h1>
          <p className="muted">可先付一部分，也可以分次記錄。</p>
        </div>
      </header>
      <section className="repayment-due" aria-label="目前應付">
        <p>目前應付{unknown ? '（上次已確認）' : ''}</p>
        <strong>
          {payer && payee
            ? `${names.get(payer)} → ${names.get(payee)} / ${currency} ${due ? formatShareAmount(due) : '0'}`
            : '選擇付款人與收款人，查看目前安排。'}
        </strong>
      </section>
      <form
        noValidate
        data-command-id={id}
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <fieldset disabled={saving || Boolean(unknown) || Boolean(warning)}>
          <legend className="sr-only">還款內容</legend>
          <div className="repayment-parties">
            <div className="field">
              <label htmlFor={payerId}>付款人</label>
              <Select
                className="ds-input"
                id={payerId}
                value={payer}
                onChange={(event) => setPayer(event.target.value)}
                aria-invalid={Boolean(errors.parties)}
                aria-describedby={`${payerId}-error`}
              >
                <option value="">選擇付款人</option>
                {active.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="field">
              <label htmlFor={payeeId}>收款人</label>
              <Select
                className="ds-input"
                id={payeeId}
                value={payee}
                onChange={(event) => setPayee(event.target.value)}
                aria-invalid={Boolean(errors.parties)}
                aria-describedby={`${payerId}-error`}
              >
                <option value="">選擇收款人</option>
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
              {errors.parties}
            </p>
          ) : null}
          <div className="repayment-money">
            <div className="field">
              <label htmlFor={amountId}>金額</label>
              <Input
                id={amountId}
                value={amount}
                inputMode="decimal"
                onChange={(event) => setAmount(event.target.value)}
                aria-invalid={Boolean(errors.amount)}
                aria-describedby={`${amountId}-error`}
              />
              <p className="error" role="alert" id={`${amountId}-error`}>
                {errors.amount}
              </p>
            </div>
            <SearchCombo
              label="幣別"
              value={currency}
              options={currencies.items.map((entry) => ({
                value: entry.code,
                label: `${entry.code} · ${entry.name}`,
              }))}
              onChange={setCurrency}
              error={errors.currency}
            />
          </div>
          <DateField label="還款日期" value={date} onChange={setDate} error={errors.date} />
        </fieldset>
        {remaining && !unknown ? (
          <section className="repayment-preview">
            <p>
              {BigInt(remaining.numerator) >= 0n
                ? `這次記錄後，將剩餘 ${currency} ${formatShareAmount(remaining)}。`
                : '還款超過目前應付時，會先告知結果，確認後才保存。'}
            </p>
            <p className="muted">只更新 {currency} 的付款安排，其他幣別不變。</p>
          </section>
        ) : null}
        {failure ? (
          <p role="alert" className="error">
            {failure}
          </p>
        ) : null}
        {warning ? (
          <section className="repayment-warning" aria-label="超額確認" role="alert">
            <h2>{warning.excessAmount ? '這筆還款超過應付額' : '付款安排已更新'}</h2>
            {warning.excessAmount ? (
              <>
                <p>
                  超額 {warning.draft.currencyCode} {formatShareAmount(warning.excessAmount)}
                  ，尚未保存。
                </p>
                <p>
                  {names.get(warning.reverseDebtorMemberId)} 應付{' '}
                  {names.get(warning.reverseCreditorMemberId)} {warning.draft.currencyCode}{' '}
                  {formatShareAmount(warning.excessAmount)}
                </p>
              </>
            ) : (
              <p>尚未保存，請確認更新後的應付金額。</p>
            )}
            {!warning.confirmation ? (
              <p>帳本已有變更，請再次確認；如仍超額，會重新取得警告並請你確認。</p>
            ) : null}
            <div className="repayment-actions">
              <Button
                type="button"
                disabled={saving}
                onClick={() => {
                  void save(true);
                }}
              >
                確認儲存還款
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => setWarning(null)}
              >
                取消
              </Button>
            </div>
          </section>
        ) : null}
        {unknown ? (
          <section className="repayment-warning" role="status">
            <h2>還款保存結果尚未確認</h2>
            <p>請先查證這次操作是否已保存。你的輸入仍會保留。</p>
            <div className="repayment-actions">
              <Button
                type="button"
                disabled={saving}
                onClick={() => {
                  if (writing.current) return;
                  writing.current = true;
                  setSaving(true);
                  void verify(unknown).finally(() => {
                    writing.current = false;
                    setSaving(false);
                  });
                }}
              >
                查證結果
              </Button>
              <Button asChild variant="outline">
                <Link to={`/trips/${trip.id}/settlement`}>返回已確認資料</Link>
              </Button>
            </div>
          </section>
        ) : null}
        <div className="repayment-actions">
          <Button type="submit" disabled={saving || Boolean(unknown) || Boolean(warning)}>
            儲存還款
          </Button>
        </div>
        {saving ? <p role="status">正在確認還款…</p> : null}
      </form>
      <p className="muted">若還款超過目前應付，會先告知結果，確認後才保存。</p>
    </div>
  );
}
