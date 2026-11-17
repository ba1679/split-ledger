import { TripManagementMenu } from './TripManagementMenu.js';
import { Button } from '../../components/ui/button.js';
import React, { useRef, useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Link, useLocation, useParams } from 'react-router-dom';
import {
  apiRequest,
  type Trip,
  type ExpenseList,
  type PersonalCurrencyTotal,
  type TripMember,
  type ItemList,
} from '../../api/index.js';
import { useSession } from '../auth/session.js';
import { QueryState } from '../../components/QueryState.js';
import { tripDates } from './Trips.js';
import { TripForm } from './TripForm.js';
import { displayAmount } from '../expenses/money.js';
import { formatShareAmount } from '../expenses/ExpenseShares.js';
import type { SettlementView } from '../settlement/types.js';
import { Icon } from '../../components/Icon.js';
import { useLedgerEntryState, useUnavailableLedgerCleanup } from './use-ledger-entry-state.js';
import { useLedgerManagement } from './use-ledger-management.js';
import { TripAccessState } from './TripAccessState.js';

export function TripLedger() {
  const { tripId } = useParams(),
    { account } = useSession();
  const [editing, setEditing] = useState(false);
  const location = useLocation();
  const unavailableHeading = useRef<HTMLHeadingElement>(null);

  const authority = useLedgerEntryState(tripId, unavailableHeading);
  const trip = useQuery({
    queryKey: ['account', account!.id, 'trip', tripId],
    queryFn: ({ signal }) => apiRequest<Trip>(`/api/trips/${tripId}`, { signal }),
    enabled: authority.data?.state === 'active',
  });

  const expenses = useInfiniteQuery({
    enabled: authority.data?.state === 'active',
    queryKey: ['account', account!.id, 'expenses', tripId],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ signal, pageParam }) =>
      apiRequest<ExpenseList>(
        `/api/trips/${tripId}/expenses${pageParam ? `?cursor=${encodeURIComponent(pageParam)}` : ''}`,
        { signal },
      ),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });

  const members = useQuery({
    enabled: authority.data?.state === 'active',
    queryKey: ['account', account!.id, 'members', tripId],
    queryFn: ({ signal }) =>
      apiRequest<ItemList<TripMember>>(`/api/trips/${tripId}/members`, { signal }),
  });

  const settlement = useQuery({
    enabled: authority.data?.state === 'active',
    queryKey: ['account', account!.id, 'settlement', tripId, 'ledger'],
    queryFn: ({ signal }) =>
      apiRequest<SettlementView>(`/api/trips/${tripId}/settlement`, { signal }),
  });

  const totals = useQuery({
    enabled: authority.data?.state === 'active',
    queryKey: ['account', account!.id, 'totals', tripId, 'personal'],
    queryFn: ({ signal }) =>
      apiRequest<{ totals: PersonalCurrencyTotal[] }>(
        `/api/trips/${tripId}/totals?scope=personal`,
        {
          signal,
        },
      ),
  });

  const rows = [
    ...new Map(
      expenses.data?.pages.flatMap((page) => page.items).map((expense) => [expense.id, expense]),
    ).values(),
  ];
  const totalCount = expenses.data?.pages.at(-1)?.totalCount ?? 0;
  useUnavailableLedgerCleanup(tripId, authority.data);
  const { lifecycleDialog, thumbnailDialog, openManagement } = useLedgerManagement(
    trip.data,
    authority.data?.state ?? 'active',
    unavailableHeading,
  );

  if (authority.isPending || authority.error || authority.data.state !== 'active')
    return (
      <>
        {lifecycleDialog}
        {thumbnailDialog}
        <TripAccessState authority={authority} tripId={tripId!} heading={unavailableHeading} />
      </>
    );

  if (trip.isPending || trip.error)
    return (
      <>
        {lifecycleDialog}
        {thumbnailDialog}
        <Link className="back" to="/trips">
          <Icon name="back" />
          <span>我的旅行</span>
        </Link>
        <QueryState
          pending={trip.isPending}
          error={trip.error}
          retry={() => {
            void trip.refetch();
          }}
        />
      </>
    );

  return (
    <>
      {lifecycleDialog}
      {thumbnailDialog}
      <Link className="back" to="/trips">
        <Icon name="back" />
        <span>我的旅行</span>
      </Link>
      <header className="page-head">
        <div>
          <div className="eyebrow">TRAVEL JOURNAL</div>
          <h1>{trip.data.name}</h1>
          <p className="muted">
            <span>{tripDates(trip.data)}</span>
            <Button variant="ghost" className="text-btn" onClick={() => setEditing(true)}>
              旅行日期
            </Button>
          </p>
        </div>
        <div className="ledger-actions">
          <Button asChild variant="default">
            <Link to={`/trips/${trip.data.id}/expenses/new`}>
              <Icon name="plus" />
              <span>記一筆</span>
            </Link>
          </Button>
          <TripManagementMenu
            onSelect={(action) => {
              openManagement(action, trip.data);
            }}
          />
        </div>
      </header>
      <nav aria-label="旅行內導覽" className="trip-navigation">
        <Button asChild variant="outline">
          <Link to={`/trips/${tripId}/members`}>
            <Icon name="members" />
            同行者
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to={`/trips/${tripId}/settlement`}>
            <Icon name="settlement" />
            分帳結算
          </Link>
        </Button>
      </nav>
      {(location.state as { message?: string } | null)?.message ? (
        <p className="feedback" role="status">
          {(location.state as { message: string }).message}
        </p>
      ) : null}
      {totals.isPending || totals.error ? (
        <QueryState
          pending={totals.isPending}
          error={totals.error}
          retry={() => {
            void totals.refetch();
          }}
        />
      ) : totals.data.totals.length ? (
        <>
          <div className="section-head">
            <span>個人總花費 · 依幣別分開統計</span>
          </div>
          <section className="totals" aria-label="分幣別總額">
            {totals.data.totals.map((total) => (
              <section
                className="total-card"
                role="group"
                aria-label={total.currencyCode}
                key={total.currencyCode}
              >
                <div className="total-label">{total.currencyCode}</div>
                <div className="total-value">
                  {displayAmount(formatShareAmount(total.amount, total.amount.minorUnit))}
                </div>
                <div className="currency-code">{total.currencyCode}</div>
              </section>
            ))}
          </section>
        </>
      ) : null}
      {members.data && settlement.data ? (
        <section aria-label="成員淨額" className="balance-grid">
          {[...new Set(settlement.data.balances.map((balance) => balance.currencyCode))].map(
            (currency) => (
              <div key={currency} className="settlement-panel">
                <h2>{currency}</h2>
                {members.data.items.map((member) => {
                  const amount = settlement.data.balances.find(
                    (balance) =>
                      balance.memberId === member.id && balance.currencyCode === currency,
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
            ),
          )}
        </section>
      ) : null}
      {expenses.isPending || !expenses.data ? (
        <QueryState
          pending={expenses.isPending}
          error={expenses.error}
          retry={() => {
            void expenses.refetch();
          }}
        />
      ) : totalCount === 0 ? (
        <div className="empty">
          <Icon name="note" />
          <h2>旅程還有很多空白，真好。</h2>
          <p>先記下一筆機票，或今天的一杯咖啡。</p>
          <Button asChild variant="default">
            <Link to={`/trips/${trip.data.id}/expenses/new`}>記錄第一筆支出</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="section-head">
            <h2>沿途的花費</h2>
            <span>{totalCount} 筆紀錄</span>
          </div>
          <div className="ledger">
            {rows.map((expense) => (
              <Link
                className="expense-row"
                to={`/trips/${tripId}/expenses/${expense.id}`}
                key={expense.id}
              >
                <span className="category-icon">
                  <Icon name="note" />
                </span>
                <div className="row-info">
                  <div className="row-title">{expense.item}</div>
                  <div className="row-sub">
                    <span>{expense.spentOn}</span>
                    {' · '}
                    <span>{expense.category?.name ?? '未分類'}</span>
                  </div>
                </div>{' '}
                <div className="row-amount">
                  {expense.currencyCode} {displayAmount(expense.amount)}
                </div>
                <Icon name="arrow" />
              </Link>
            ))}
          </div>
          {expenses.error ? (
            <p className="error" role="alert">
              暫時無法更新支出清單，已載入的紀錄仍保留。
              {!expenses.isFetchNextPageError ? (
                <Button
                  variant="ghost"
                  type="button"
                  className="text-btn"
                  disabled={expenses.isFetching}
                  onClick={() => {
                    void expenses.refetch();
                  }}
                >
                  重新更新清單
                </Button>
              ) : null}
            </p>
          ) : null}
          {expenses.hasNextPage ? (
            <div className="load-more">
              <Button
                type="button"
                variant="outline"
                disabled={expenses.isFetching}
                onClick={() => {
                  void expenses.fetchNextPage();
                }}
              >
                {expenses.isFetchingNextPage ? '載入中…' : '載入更多'}
              </Button>
            </div>
          ) : null}
        </>
      )}
      {editing ? <TripForm trip={trip.data} onClose={() => setEditing(false)} /> : null}
    </>
  );
}
