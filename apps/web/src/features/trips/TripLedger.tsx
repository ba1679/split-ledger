import { Button } from '../../components/ui/button.js';
import React, { useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Link, useLocation, useParams } from 'react-router-dom';
import { apiRequest, type Trip, type ExpenseList, type CurrencyTotal } from '../../api/index.js';
import { useSession } from '../auth/session.js';
import { QueryState } from '../../components/QueryState.js';
import { tripDates } from './Trips.js';
import { TripForm } from './TripForm.js';
import { displayAmount } from '../expenses/money.js';
import { Icon } from '../../components/Icon.js';

export function TripLedger() {
  const { tripId } = useParams(),
    { account } = useSession();
  const [editing, setEditing] = useState(false);
  const location = useLocation();
  const trip = useQuery({
    queryKey: ['account', account!.id, 'trip', tripId],
    queryFn: ({ signal }) => apiRequest<Trip>(`/api/trips/${tripId}`, { signal }),
  });

  const expenses = useInfiniteQuery({
    queryKey: ['account', account!.id, 'expenses', tripId],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ signal, pageParam }) =>
      apiRequest<ExpenseList>(
        `/api/trips/${tripId}/expenses${pageParam ? `?cursor=${encodeURIComponent(pageParam)}` : ''}`,
        { signal },
      ),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });

  const totals = useQuery({
    queryKey: ['account', account!.id, 'totals', tripId],
    queryFn: ({ signal }) =>
      apiRequest<{ totals: CurrencyTotal[] }>(`/api/trips/${tripId}/totals`, { signal }),
  });

  const rows = [
    ...new Map(
      expenses.data?.pages.flatMap((page) => page.items).map((expense) => [expense.id, expense]),
    ).values(),
  ];
  const totalCount = expenses.data?.pages.at(-1)?.totalCount ?? 0;

  if (trip.isPending || trip.error)
    return (
      <>
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
        <Button asChild variant="default">
          <Link to={`/trips/${trip.data.id}/expenses/new`}>
            <Icon name="plus" />
            <span>記一筆</span>
          </Link>
        </Button>
      </header>
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
            <span>這趟旅行的花費 · 依幣別分開統計</span>
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
                <div className="total-value">{displayAmount(total.amount)}</div>
                <div className="currency-code">{total.currencyCode}</div>
              </section>
            ))}
          </section>
        </>
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
                </div>
                <div className="row-amount">
                  {displayAmount(expense.amount)}
                  <small>{expense.currencyCode}</small>
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
