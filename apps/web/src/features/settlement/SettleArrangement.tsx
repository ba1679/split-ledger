import React, { useEffect, useId, useRef, useState } from 'react';
import {
  parseMoney,
  classifyArrangementPayment,
  prefillArrangementPayment,
  type ExactAmount,
} from '@split-ledger/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  apiRequest,
  apiErrorMessage,
  ApiError,
  type ItemList,
  type Trip,
  type TripMember,
  type CurrencyList,
} from '../../api/index.js';
import { Button } from '../../components/ui/button.js';
import { ActionButton } from '../../components/waiting/ActionButton.js';
import { Input } from '../../components/ui/input.js';
import { DateField } from '../../components/DateField.js';
import { dateOnly, localToday, parseDate } from '../../components/date.js';
import { QueryState } from '../../components/QueryState.js';
import { Icon } from '../../components/Icon.js';
import { formatShareAmount } from '../expenses/ExpenseShares.js';
import { useSession } from '../auth/session.js';
import type {
  SettlementArrangement,
  SettlementRecord,
  SettlementView,
  SettleArrangementRequest,
  ArrangementPaymentResult,
  PartialArrangementPayment,
} from './types.js';
import type { Repayment } from '../repayments/types.js';
import { displayAmount } from '../expenses/money.js';
import { useTranslation } from 'react-i18next';
import { registerInterfaceMessages } from '../../i18n/runtime.js';
import './settle.css';

registerInterfaceMessages('settleForm', {
  form: ['結清表單', 'Payment form'],
  changed: ['付款安排已更新，請重新載入。', 'Payment arrangements have changed. Reload them.'],
  back: ['返回安排', 'Back to arrangements'],
  amountInvalid: [
    '請輸入符合幣別位數的正數實付金額。',
    'Enter a positive amount paid with valid currency precision.',
  ],
  dateInvalid: ['請輸入有效結清日期（YYYY/MM/DD）。', 'Enter a valid payment date (YYYY/MM/DD).'],
  title: ['記錄實付', 'Record a payment'],
  intro: [
    '填入實際收到的金額；不足額時記錄部分還款，剩餘欠款會保留。',
    'Enter the amount actually paid. A partial payment leaves the remaining amount due.',
  ],
  due: ['這筆安排的應付金額', 'Amount due for this arrangement'],
  paid: ['實付金額', 'Amount paid'],
  amountPlaceholder: ['輸入實際支付金額', 'Enter amount paid'],
  amountHint: [
    '已帶入剩餘應付，請依付款人實際支付的金額調整。',
    'The remaining amount due is filled in. Adjust it to the amount actually paid.',
  ],
  date: ['結清日期', 'Payment date'],
  stale: [
    '付款安排已更新，請重新載入後再結清。',
    'Payment arrangements have changed. Reload before settling.',
  ],
  reload: ['重新載入安排', 'Reload arrangements'],
  partialUnknown: [
    '部分還款結果尚未確認，請查證原本這次操作的結果。',
    'Payment status unconfirmed. Check whether the partial payment was recorded.',
  ],
  settleUnknown: [
    '結清結果尚未確認，請查證原本這次操作的結果。',
    'Payment status unconfirmed. Check whether the payment was recorded.',
  ],
  check: ['查證結果', 'Check status'],
  checking: ['正在查證原次實付結果', 'Checking payment status'],
  partialSaved: [
    '已記錄部分還款：實付 {{paidCurrency}} {{paid}}；尚欠 {{dueCurrency}} {{due}}。這筆安排尚未結清。',
    'Partial payment recorded: {{paidCurrency}} {{paid}} paid; {{dueCurrency}} {{due}} remains due. This arrangement is not settled.',
  ],
  settled: [
    '結清成功：應付 {{currency}} {{due}}；實付 {{currency}} {{paid}}。這筆安排已結清。',
    'Settlement complete: {{currency}} {{due}} due; {{currency}} {{paid}} paid. This arrangement is settled.',
  ],
  partialAction: ['記錄部分還款', 'Record partial payment'],
  settleAction: ['結清這筆安排', 'Settle this arrangement'],
});

function sameExact(left: ExactAmount, right: ExactAmount) {
  return (
    left.minorUnit === right.minorUnit &&
    BigInt(left.numerator) * BigInt(right.denominator) ===
      BigInt(right.numerator) * BigInt(left.denominator)
  );
}

function matchesRecord(
  record: SettlementRecord,
  command: SettleArrangementRequest,
  tripId: string,
) {
  try {
    return (
      record.id === command.id &&
      record.tripId === tripId &&
      record.arrangementKey === command.arrangementKey &&
      record.sourceRevision === command.accountingRevision &&
      record.debtorMemberId === command.debtorMemberId &&
      record.creditorMemberId === command.creditorMemberId &&
      record.currencyCode === command.currencyCode &&
      sameExact(record.obligation, command.expectedAmount) &&
      record.repayment.id === command.repaymentId &&
      record.repayment.kind === 'settlement' &&
      record.repayment.settlementId === command.id &&
      record.repayment.paidOn === command.paidOn &&
      parseMoney(record.repayment.amount, record.repayment.minorUnit) ===
        parseMoney(command.paidAmount, record.repayment.minorUnit, command.currencyCode)
    );
  } catch {
    return false;
  }
}

function partialResult(
  payment: Repayment,
  command: SettleArrangementRequest,
  tripId: string,
): PartialArrangementPayment | null {
  try {
    const paid = parseMoney(command.paidAmount, payment.minorUnit, command.currencyCode);
    const classification = classifyArrangementPayment(
      command.expectedAmount,
      paid,
      payment.minorUnit,
    );
    if (
      !classification.partial ||
      payment.id !== command.repaymentId ||
      payment.tripId !== tripId ||
      payment.payerMemberId !== command.debtorMemberId ||
      payment.payeeMemberId !== command.creditorMemberId ||
      payment.currencyCode !== command.currencyCode ||
      payment.paidOn !== command.paidOn ||
      payment.kind !== 'independent' ||
      payment.settlementId !== null ||
      parseMoney(payment.amount, payment.minorUnit) !== paid
    )
      return null;

    return {
      kind: 'partial',
      repayment: payment,
      remainingAmount: classification.remainingAmount,
      accountingRevision: (BigInt(command.accountingRevision) + 1n).toString(),
    };
  } catch {
    return null;
  }
}

function matchesResult(
  result: ArrangementPaymentResult,
  command: SettleArrangementRequest,
  tripId: string,
) {
  if (!('kind' in result)) return matchesRecord(result, command, tripId);
  const expected = partialResult(result.repayment, command, tripId);

  return Boolean(
    expected &&
    sameExact(expected.remainingAmount, result.remainingAmount) &&
    expected.accountingRevision === result.accountingRevision,
  );
}

export function SettleArrangement() {
  const { t } = useTranslation();
  const { tripId } = useParams();
  const [search] = useSearchParams();
  const { account } = useSession();
  const [visitId] = useState(() => crypto.randomUUID());
  const base = `/api/trips/${tripId}`;
  const query = useQuery({
    queryKey: [
      'account',
      account!.id,
      'settlement',
      tripId,
      'form',
      search.get('arrangementKey'),
      visitId,
    ],
    queryFn: async ({ signal }) => {
      const [trip, members, settlement, currencies] = await Promise.all([
        apiRequest<Trip>(base, { signal }),
        apiRequest<ItemList<TripMember>>(`${base}/members`, { signal }),
        apiRequest<SettlementView>(`${base}/settlement`, { signal }),
        apiRequest<CurrencyList>('/api/currencies', { signal }),
      ]);

      return { trip, members: members.items, settlement, currencies };
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  if (!query.data)
    return (
      <QueryState
        label={t('settleForm.form')}
        layout="form"
        fetchStatus={query.fetchStatus}
        pending={query.isPending}
        error={query.error}
        retry={() => {
          void query.refetch();
        }}
      />
    );
  const key = search.get('arrangementKey');

  return (
    <LoadedSettlement
      key={`${account!.id}:${tripId}:${key}`}
      initial={query.data}
      arrangementKey={key}
    />
  );
}

function LoadedSettlement({
  initial,
  arrangementKey,
}: {
  initial: {
    trip: Trip;
    members: TripMember[];
    settlement: SettlementView;
    currencies: CurrencyList;
  };
  arrangementKey: string | null;
}) {
  const { t } = useTranslation();
  // The command must keep the exact arrangement the owner opened, even if a later
  // query changes after a committed POST or another device edits the trip.
  const [snapshot] = useState(initial);
  const arrangement = snapshot.settlement.arrangements.find(
    (entry) => entry.key === arrangementKey,
  );
  if (!arrangement)
    return (
      <div className="settle-page" role="region" aria-label={t('settleForm.form')}>
        <p role="alert">{t('settleForm.changed')}</p>
        <Link to={`/trips/${snapshot.trip.id}/settlement`}>{t('settleForm.back')}</Link>
      </div>
    );

  return (
    <SettleEditor
      trip={snapshot.trip}
      members={snapshot.members}
      arrangement={arrangement}
      revision={snapshot.settlement.accountingRevision}
      precision={
        snapshot.currencies.items.find((currency) => currency.code === arrangement.currencyCode)
          ?.minorUnit ?? arrangement.amount.minorUnit
      }
    />
  );
}

function SettleEditor({
  trip,
  members,
  arrangement,
  revision,
  precision,
}: {
  trip: Trip;
  members: TripMember[];
  arrangement: SettlementArrangement;
  revision: string;
  precision: number;
}) {
  const { t } = useTranslation();
  const { account } = useSession();
  const client = useQueryClient();
  const base = `/api/trips/${trip.id}`;
  const [id] = useState(() => crypto.randomUUID());
  const [repaymentId] = useState(() => crypto.randomUUID());
  const [amount, setAmount] = useState(() =>
    prefillArrangementPayment(arrangement.amount, precision, arrangement.currencyCode),
  );
  const [date, setDate] = useState(() => dateOnly(localToday()).replaceAll('-', '/'));
  const [amountInvalid, setAmountInvalid] = useState(false);
  const [dateInvalid, setDateInvalid] = useState(false);
  const [failure, setFailure] = useState<ApiError | null>(null);
  const [stale, setStale] = useState(false);
  const [unknown, setUnknown] = useState<SettleArrangementRequest | null>(null);
  const [saved, setSaved] = useState<ArrangementPaymentResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const checkingNow = useRef(false);
  const recheck = useRef<HTMLButtonElement>(null);
  const alive = useRef(true);
  const writing = useRef(false);
  useEffect(() => {
    alive.current = true;

    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    if (unknown && recheck.current) {
      recheck.current.scrollIntoView({ block: 'center', inline: 'nearest' });
      recheck.current.focus({ preventScroll: true });
    }
  }, [unknown]);
  const amountId = useId();
  const names = new Map(members.map((member) => [member.id, member.name]));
  const payer = names.get(arrangement.debtorMemberId);
  const payee = names.get(arrangement.creditorMemberId);
  const locked = busy || checking || Boolean(unknown) || Boolean(saved) || stale;

  let partialDraft = false;
  try {
    partialDraft = classifyArrangementPayment(
      arrangement.amount,
      parseMoney(amount, precision, arrangement.currencyCode),
      precision,
    ).partial;
  } catch {
    // Invalid or blank input remains an editable draft, not a payment.
  }

  async function confirmed(record: ArrangementPaymentResult) {
    if (!alive.current) return;
    setSaved(record);
    setUnknown(null);
    await Promise.all(
      ['settlement', 'repayments', 'trip', 'trips'].map((resource) =>
        client.invalidateQueries({
          queryKey: ['account', account!.id, resource],
          predicate: (query) => query.queryKey[4] !== 'form',
        }),
      ),
    );
  }

  async function verify(command: SettleArrangementRequest) {
    if (checkingNow.current || !alive.current) return;
    checkingNow.current = true;
    setBusy(false);
    setChecking(true);
    setUnknown(command);
    try {
      try {
        const record = await apiRequest<SettlementRecord>(`${base}/settlements/${command.id}`, {
          signal: AbortSignal.timeout(5000),
        });
        if (!alive.current) return;
        if (matchesRecord(record, command, trip.id)) {
          await confirmed(record);

          return;
        }
      } catch {
        // A temporary 404 or transport failure cannot prove the POST did not commit.
      }
      if (!alive.current) return;
      try {
        const payment = await apiRequest<Repayment>(`${base}/repayments/${command.repaymentId}`, {
          signal: AbortSignal.timeout(5000),
        });
        if (!alive.current) return;
        const partial = partialResult(payment, command, trip.id);
        if (partial) {
          await confirmed(partial);

          return;
        }
      } catch {
        // Retain the original command and draft when neither result is confirmed.
      }
    } finally {
      checkingNow.current = false;
      if (alive.current) setChecking(false);
    }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (writing.current || locked) return;
    setFailure(null);
    let validAmount = false;
    try {
      validAmount = parseMoney(amount, precision, arrangement.currencyCode) > 0n;
    } catch {
      /* Show the same field correction for invalid precision. */
    }
    const parsedDate = parseDate(date);
    setAmountInvalid(!validAmount);
    setDateInvalid(!parsedDate);
    if (!validAmount || !parsedDate) return;
    const command: SettleArrangementRequest = {
      id,
      repaymentId,
      arrangementKey: arrangement.key,
      accountingRevision: revision,
      debtorMemberId: arrangement.debtorMemberId,
      creditorMemberId: arrangement.creditorMemberId,
      currencyCode: arrangement.currencyCode,
      expectedAmount: arrangement.amount,
      paidAmount: amount,
      paidOn: dateOnly(parsedDate),
    };
    writing.current = true;
    setBusy(true);
    try {
      const record = await apiRequest<ArrangementPaymentResult>(`${base}/settlements`, {
        method: 'POST',
        signal: AbortSignal.timeout(15000),
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(command),
      });
      if (!alive.current) return;
      if (matchesResult(record, command, trip.id)) await confirmed(record);
      else await verify(command);
    } catch (error) {
      if (!alive.current) return;
      if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
        if (['ACCOUNTING_REVISION_CONFLICT', 'ARRANGEMENT_NOT_FOUND'].includes(error.code))
          setStale(true);
        else setFailure(error);
      } else await verify(command);
    } finally {
      writing.current = false;
      if (alive.current) setBusy(false);
    }
  }

  return (
    <div className="settle-page" role="region" aria-label={t('settleForm.form')}>
      <Link className="back" to={`/trips/${trip.id}/settlement`}>
        <Icon name="back" />
        <span>{t('settleForm.back')}</span>
      </Link>
      <header className="page-head">
        <div>
          <h1>{t('settleForm.title')}</h1>
          <p className="muted">{t('settleForm.intro')}</p>
        </div>
      </header>
      <section className="settle-due" aria-label={t('settleForm.due')}>
        <p>{t('settleForm.due')}</p>
        <h2>
          {payer} → {payee}
        </h2>
        <strong>
          {arrangement.currencyCode} {formatShareAmount(arrangement.amount)}
        </strong>
      </section>
      <form
        data-command-id={id}
        data-repayment-id={repaymentId}
        onSubmit={(event) => {
          void save(event);
        }}
        noValidate
      >
        <div className="field">
          <label htmlFor={amountId}>{t('settleForm.paid')}</label>
          <Input
            id={amountId}
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder={t('settleForm.amountPlaceholder')}
            aria-invalid={amountInvalid}
            aria-describedby={`${amountId}-hint ${amountId}-error`}
            disabled={locked}
          />
          <p id={`${amountId}-hint`} className="field-hint">
            {t('settleForm.amountHint')}
          </p>
          <p id={`${amountId}-error`} role="alert" className="error">
            {amountInvalid ? t('settleForm.amountInvalid') : ''}
          </p>
        </div>
        <fieldset disabled={locked}>
          <DateField
            label={t('settleForm.date')}
            value={date}
            onChange={setDate}
            error={dateInvalid ? t('settleForm.dateInvalid') : ''}
          />
        </fieldset>
        {stale ? (
          <p role="alert" className="error">
            {t('settleForm.stale')}
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                window.location.assign(`/trips/${trip.id}/settlement`);
              }}
            >
              {t('settleForm.reload')}
            </Button>
          </p>
        ) : null}
        {failure ? (
          <p role="alert" className="error">
            {apiErrorMessage(failure)}
          </p>
        ) : null}
        {unknown ? (
          <div role="alert" className="settle-unknown">
            <p>{t(partialDraft ? 'settleForm.partialUnknown' : 'settleForm.settleUnknown')}</p>
            <ActionButton
              ref={recheck}
              type="button"
              variant="outline"
              busy={checking}
              label={t('settleForm.check')}
              busyLabel={t('settleForm.checking')}
              onClick={() => {
                void verify(unknown);
              }}
            />
          </div>
        ) : null}
        {saved && 'kind' in saved ? (
          <p role="status" className="feedback">
            {t('settleForm.partialSaved', {
              paidCurrency: saved.repayment.currencyCode,
              paid: displayAmount(saved.repayment.amount),
              dueCurrency: saved.repayment.currencyCode,
              due: displayAmount(formatShareAmount(saved.remainingAmount)),
            })}
          </p>
        ) : saved ? (
          <p role="status" className="feedback">
            {t('settleForm.settled', {
              currency: saved.currencyCode,
              due: formatShareAmount(saved.obligation),
              paid: saved.repayment.amount,
            })}
          </p>
        ) : null}
        <div className="settle-actions">
          <ActionButton
            busy={busy}
            label={t(partialDraft ? 'settleForm.partialAction' : 'settleForm.settleAction')}
            type="submit"
            disabled={locked}
          />
          <Button asChild type="button" variant="outline">
            <Link to={`/trips/${trip.id}/settlement`}>{t('settleForm.back')}</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
