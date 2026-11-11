import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useParams } from 'react-router-dom';
import {
  apiRequest,
  ApiError,
  type Trip,
  type TripMember,
  type ItemList,
} from '../../api/index.js';
import type { Repayment } from '../repayments/types.js';
import type { SettlementView } from './types.js';
import { useSession } from '../auth/session.js';
import { formatShareAmount } from '../expenses/ExpenseShares.js';
import { displayAmount } from '../expenses/money.js';
import { Button } from '../../components/ui/button.js';
import { QueryState } from '../../components/QueryState.js';
import { Icon } from '../../components/Icon.js';
import './settlement.css';

/** Publish only a trip and calculation confirmed at the same accounting version. */
async function readSettlement(base: string, signal?: AbortSignal) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const [trip, settlement, members, repayments] = await Promise.all([
      apiRequest<Trip>(base, { signal }),
      apiRequest<SettlementView>(`${base}/settlement`, { signal }),
      apiRequest<ItemList<TripMember>>(`${base}/members`, { signal }),
      apiRequest<ItemList<Repayment>>(`${base}/repayments`, { signal }),
    ]);
    if (
      trip.accountingRevision === settlement.accountingRevision &&
      trip.simplifyDebts === settlement.simplifyDebts
    )
      return { trip, settlement, members: members.items, repayments: repayments.items };
  }
  throw new Error('帳本已更新，請重新載入付款安排。');
}

export function TripSettlement() {
  const location = useLocation();
  const { tripId } = useParams();
  const { account } = useSession();
  const client = useQueryClient();
  const base = `/api/trips/${tripId}`;
  const queryKey = ['account', account!.id, 'settlement', tripId, 'screen'];
  const query = useQuery({ queryKey, queryFn: ({ signal }) => readSettlement(base, signal) });
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<{ target: boolean; unknown: boolean } | null>(null);

  async function changeMode(target: boolean) {
    if (saving) return;
    setSaving(true);
    setFailure(null);
    let saved = false;
    try {
      await client.cancelQueries({ queryKey });
      await apiRequest<Trip>(base, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ simplifyDebts: target }),
      });
      saved = true;
      const confirmed = await readSettlement(base);
      client.setQueryData(queryKey, confirmed);
      client.setQueryData(['account', account!.id, 'trip', tripId], confirmed.trip);
    } catch (error) {
      setFailure({
        target,
        unknown: saved || !(error instanceof ApiError && error.status >= 400 && error.status < 500),
      });
    } finally {
      setSaving(false);
    }
  }

  async function confirmMode() {
    setSaving(true);
    try {
      const confirmed = await readSettlement(base);
      client.setQueryData(queryKey, confirmed);
      client.setQueryData(['account', account!.id, 'trip', tripId], confirmed.trip);
      setFailure(null);
    } catch {
      // Keep the last confirmed graph while the result cannot be verified.
    } finally {
      setSaving(false);
    }
  }

  const back = (
    <Link className="back" to={`/trips/${tripId}`}>
      <Icon name="back" />
      <span>{query.data?.trip.name ?? '旅行帳本'}</span>
    </Link>
  );
  if (!query.data)
    return (
      <>
        {back}
        <QueryState
          pending={query.isPending}
          error={query.error}
          retry={() => {
            void query.refetch();
          }}
        />
      </>
    );
  const { settlement, members, repayments } = query.data;
  const names = new Map(members.map((member) => [member.id, member.name]));
  const currencies = [
    ...new Set([
      ...settlement.balances.map((balance) => balance.currencyCode),
      ...settlement.arrangements.map((arrangement) => arrangement.currencyCode),
      ...repayments.map((repayment) => repayment.currencyCode),
    ]),
  ].sort();

  return (
    <div className="settlement-page">
      {back}
      {location.state?.message ? (
        <p role="status" className="notice">
          {location.state.message}
        </p>
      ) : null}
      <header className="page-head">
        <div>
          <h1>誰該付給誰</h1>
          <p className="muted">查看每個人的應收、應付與付款安排。</p>
        </div>
      </header>
      <section
        className="settlement-panel simplification-panel"
        aria-labelledby="simplification-title"
      >
        <div className="simplification-heading">
          <div>
            <h2 id="simplification-title">簡化付款</h2>
            <p className="muted">調整付款對象，減少轉帳筆數。</p>
          </div>
          <button
            type="button"
            className="simplification-switch"
            role="switch"
            aria-label="簡化付款"
            aria-checked={settlement.simplifyDebts}
            aria-busy={saving}
            disabled={saving || failure?.unknown}
            onClick={() => {
              void changeMode(!settlement.simplifyDebts);
            }}
          >
            <span />
          </button>
        </div>
        <p>{settlement.explanation}</p>
        <p className="muted">
          直接安排 {settlement.directArrangementCount} 筆 · 目前安排{' '}
          {settlement.suggestedArrangementCount} 筆
        </p>
        <span role="status" className="sr-only">
          {saving ? '正在確認付款安排…' : ''}
        </span>
        {failure ? (
          <div className="error" role="alert">
            <p>
              {failure.unknown
                ? '簡化付款保存結果尚未確認，暫時保留上次已確認的安排。'
                : '簡化付款保存失敗，已保留上次確認的安排。'}
            </p>
            <Button
              variant="outline"
              disabled={saving}
              onClick={() => {
                if (failure.unknown) void confirmMode();
                else void changeMode(failure.target);
              }}
            >
              {failure.unknown ? '查證結果' : '重試'}
            </Button>
          </div>
        ) : null}
      </section>
      {query.error ? (
        <p role="alert" className="error">
          目前無法更新，仍顯示上次已確認的付款安排。
          <Button
            variant="outline"
            onClick={() => {
              void query.refetch();
            }}
          >
            重新載入
          </Button>
        </p>
      ) : null}
      <section aria-label="成員淨額" className="balance-grid">
        {currencies.map((currency) => (
          <div key={currency} className="settlement-panel">
            <h2>{currency}</h2>
            {members.map((member) => {
              const amount = settlement.balances.find(
                (balance) => balance.memberId === member.id && balance.currencyCode === currency,
              )?.netAmount ?? { numerator: '0', denominator: '1', minorUnit: 0 };
              const sign = BigInt(amount.numerator);

              return (
                <div
                  className="balance-row"
                  key={member.id}
                  role="group"
                  aria-label={`${member.name} ${currency}`}
                >
                  <span className="balance-person">
                    <span>{member.name}</span>
                    <span>{sign > 0n ? '應收' : sign < 0n ? '應付' : '已平衡'}</span>
                  </span>
                  <strong className={sign > 0n ? 'receivable' : undefined}>
                    {currency} {formatShareAmount(amount)}
                  </strong>
                </div>
              );
            })}
          </div>
        ))}
      </section>
      <section className="settlement-panel" aria-label="付款安排">
        <h2>待付款安排</h2>
        {currencies
          .filter(
            (currency) => !settlement.arrangements.some((entry) => entry.currencyCode === currency),
          )
          .map((currency) => (
            <p key={currency}>{currency} 已結清，目前沒有待付款安排。</p>
          ))}
        {settlement.arrangements.length ? (
          settlement.arrangements.map((arrangement) => {
            const payer = names.get(arrangement.debtorMemberId),
              payee = names.get(arrangement.creditorMemberId);

            return (
              <div
                className="arrangement-row"
                role="group"
                aria-label={`${payer} 付款給 ${payee} ${arrangement.currencyCode}`}
                key={arrangement.key}
              >
                <div>
                  <p>
                    {payer} → {payee}
                  </p>
                  <strong className="arrangement-amount">
                    {arrangement.currencyCode} {formatShareAmount(arrangement.amount)}
                  </strong>
                </div>
                <Button asChild variant="outline">
                  <Link
                    to={`/trips/${tripId}/settlements/new?arrangementKey=${encodeURIComponent(arrangement.key)}`}
                  >
                    結清
                  </Link>
                </Button>
              </div>
            );
          })
        ) : (
          <p>這趟旅行的帳已平衡，目前沒有待付款安排。</p>
        )}
      </section>
      <section className="repayment-history">
        <h2>實際還款</h2>
        <Button asChild variant="outline">
          <Link to={`/trips/${tripId}/repayments/new`}>記錄還款</Link>
        </Button>
        <ul aria-label="還款紀錄">
          {repayments.map((repayment) => (
            <li key={repayment.id}>
              <span>
                {names.get(repayment.payerMemberId)} 支付 {names.get(repayment.payeeMemberId)}
              </span>
              <span>{repayment.paidOn}</span>
              <strong>
                {repayment.currencyCode} {displayAmount(repayment.amount)}
              </strong>
            </li>
          ))}
        </ul>
        {repayments.length === 0 ? <p className="muted">目前還沒有已記錄的實際還款。</p> : null}
      </section>
    </div>
  );
}
