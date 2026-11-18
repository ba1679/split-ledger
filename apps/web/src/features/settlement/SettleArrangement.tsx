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
import './settle.css';

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
        label="結清表單"
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
  // The command must keep the exact arrangement the owner opened, even if a later
  // query changes after a committed POST or another device edits the trip.
  const [snapshot] = useState(initial);
  const arrangement = snapshot.settlement.arrangements.find(
    (entry) => entry.key === arrangementKey,
  );
  if (!arrangement)
    return (
      <div className="settle-page" role="region" aria-label="結清表單">
        <p role="alert">付款安排已更新，請重新載入。</p>
        <Link to={`/trips/${snapshot.trip.id}/settlement`}>返回安排</Link>
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
  const { account } = useSession();
  const client = useQueryClient();
  const base = `/api/trips/${trip.id}`;
  const [id] = useState(() => crypto.randomUUID());
  const [repaymentId] = useState(() => crypto.randomUUID());
  const [amount, setAmount] = useState(() =>
    prefillArrangementPayment(arrangement.amount, precision, arrangement.currencyCode),
  );
  const [date, setDate] = useState(() => dateOnly(localToday()).replaceAll('-', '/'));
  const [amountError, setAmountError] = useState('');
  const [dateError, setDateError] = useState('');
  const [failure, setFailure] = useState('');
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
    setFailure('');
    let validAmount = false;
    try {
      validAmount = parseMoney(amount, precision, arrangement.currencyCode) > 0n;
    } catch {
      /* Show the same field correction for invalid precision. */
    }
    const parsedDate = parseDate(date);
    setAmountError(validAmount ? '' : '請輸入符合幣別位數的正數實付金額。');
    setDateError(parsedDate ? '' : '請輸入有效結清日期（YYYY/MM/DD）。');
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
        else setFailure(error.message);
      } else await verify(command);
    } finally {
      writing.current = false;
      if (alive.current) setBusy(false);
    }
  }

  return (
    <div className="settle-page" role="region" aria-label="結清表單">
      <Link className="back" to={`/trips/${trip.id}/settlement`}>
        <Icon name="back" />
        <span>返回安排</span>
      </Link>
      <header className="page-head">
        <div>
          <h1>記錄實付</h1>
          <p className="muted">填入實際收到的金額；不足額時記錄部分還款，剩餘欠款會保留。</p>
        </div>
      </header>
      <section className="settle-due" aria-label="這筆安排的應付金額">
        <p>這筆安排的應付金額</p>
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
          <label htmlFor={amountId}>實付金額</label>
          <Input
            id={amountId}
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="輸入實際支付金額"
            aria-invalid={Boolean(amountError)}
            aria-describedby={`${amountId}-hint ${amountId}-error`}
            disabled={locked}
          />
          <p id={`${amountId}-hint`} className="field-hint">
            已帶入剩餘應付，請依付款人實際支付的金額調整。
          </p>
          <p id={`${amountId}-error`} role="alert" className="error">
            {amountError}
          </p>
        </div>
        <fieldset disabled={locked}>
          <DateField label="結清日期" value={date} onChange={setDate} error={dateError} />
        </fieldset>
        {stale ? (
          <p role="alert" className="error">
            付款安排已更新，請重新載入後再結清。
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                window.location.assign(`/trips/${trip.id}/settlement`);
              }}
            >
              重新載入安排
            </Button>
          </p>
        ) : null}
        {failure ? (
          <p role="alert" className="error">
            {failure}
          </p>
        ) : null}
        {unknown ? (
          <div role="alert" className="settle-unknown">
            <p>
              {partialDraft ? '部分還款結果尚未確認' : '結清結果尚未確認'}
              ，請查證原本這次操作的結果。
            </p>
            <ActionButton
              ref={recheck}
              type="button"
              variant="outline"
              busy={checking}
              label="查證結果"
              busyLabel="正在查證原次實付結果"
              onClick={() => {
                void verify(unknown);
              }}
            />
          </div>
        ) : null}
        {saved && 'kind' in saved ? (
          <p role="status" className="feedback">
            已記錄部分還款：實付 {saved.repayment.currencyCode}{' '}
            {displayAmount(saved.repayment.amount)}；尚欠 {saved.repayment.currencyCode}{' '}
            {displayAmount(formatShareAmount(saved.remainingAmount))}。這筆安排尚未結清。
          </p>
        ) : saved ? (
          <p role="status" className="feedback">
            結清成功：應付 {saved.currencyCode} {formatShareAmount(saved.obligation)}；實付{' '}
            {saved.currencyCode} {saved.repayment.amount}。這筆安排已結清。
          </p>
        ) : null}
        <div className="settle-actions">
          <ActionButton
            busy={busy}
            label={partialDraft ? '記錄部分還款' : '結清這筆安排'}
            type="submit"
            disabled={locked}
          />
          <Button asChild type="button" variant="outline">
            <Link to={`/trips/${trip.id}/settlement`}>返回安排</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
