import React, { useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Link, useLocation, useParams } from 'react-router-dom';
import { apiRequest, type Trip, type ExpenseList, type CurrencyTotal } from '../../api/index.js';
import { useSession } from '../auth/session.js';
import { QueryState } from '../../components/QueryState.js';
import { tripDates } from './Trips.js';
import { TripForm } from './TripForm.js';
import { displayAmount } from '../expenses/money.js';

export function TripLedger() {
  const { tripId } = useParams(), { account } = useSession();
  const [editing, setEditing] = useState(false);
  const location = useLocation();
  const trip = useQuery({ queryKey: ['account', account!.id, 'trip', tripId], queryFn: ({ signal }) => apiRequest<Trip>(`/api/trips/${tripId}`, { signal }) });
  const expenses = useInfiniteQuery({
    queryKey: ['account', account!.id, 'expenses', tripId], initialPageParam: undefined as string | undefined,
    queryFn: ({ signal, pageParam }) => apiRequest<ExpenseList>(`/api/trips/${tripId}/expenses${pageParam ? `?cursor=${encodeURIComponent(pageParam)}` : ''}`, { signal }),
    getNextPageParam: page => page.nextCursor ?? undefined,
  });
  const totals = useQuery({ queryKey: ['account', account!.id, 'totals', tripId], queryFn: ({ signal }) => apiRequest<{ totals: CurrencyTotal[] }>(`/api/trips/${tripId}/totals`, { signal }) });
  const rows = [...new Map(expenses.data?.pages.flatMap(page => page.items).map(expense => [expense.id, expense])).values()];
  const totalCount = expenses.data?.pages.at(-1)?.totalCount ?? 0;
  if (trip.isPending || trip.error) return <><Link className="back" to="/trips">我的旅行</Link><QueryState pending={trip.isPending} error={trip.error} retry={() => { void trip.refetch(); }} /></>;
  return <>
    <Link className="back" to="/trips">我的旅行</Link>
    <header className="page-head"><div><div className="eyebrow">TRAVEL JOURNAL</div><h1>{trip.data.name}</h1><p className="muted"><span>{tripDates(trip.data)}</span><button className="text-btn" onClick={() => setEditing(true)}>旅行日期</button></p></div><Link className="btn" to={`/trips/${trip.data.id}/expenses/new`}>記一筆</Link></header>
    {(location.state as { message?: string } | null)?.message ? <p className="feedback" role="status">{(location.state as { message: string }).message}</p> : null}
    {totals.isPending || totals.error ? <QueryState pending={totals.isPending} error={totals.error} retry={() => { void totals.refetch(); }} /> : totals.data.totals.length ? <>
      <div className="section-head"><span>這趟旅行的花費 · 依幣別分開統計</span></div>
      <section className="totals" aria-label="分幣別總額">{totals.data.totals.map(total => <section className="total-card" role="group" aria-label={total.currencyCode} key={total.currencyCode}>
        <div className="total-label">{total.currencyCode}</div><div className="total-value">{displayAmount(total.amount)}</div><div className="currency-code">{total.currencyCode}</div>
      </section>)}</section>
    </> : null}
    {expenses.isPending || !expenses.data ? <QueryState pending={expenses.isPending} error={expenses.error} retry={() => { void expenses.refetch(); }} /> : totalCount === 0 ?
      <div className="empty"><h2>旅程還有很多空白，真好。</h2><p>先記下一筆機票，或今天的一杯咖啡。</p><Link className="btn" to={`/trips/${trip.data.id}/expenses/new`}>記錄第一筆支出</Link></div> : <>
        <div className="section-head"><h2>沿途的花費</h2><span>{totalCount} 筆紀錄</span></div>
        <div className="ledger">{rows.map(expense => <Link className="expense-row" to={`/trips/${tripId}/expenses/${expense.id}`} key={expense.id}>
          <span className="category-icon" aria-hidden="true"><svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M6 3h12v18H6zM9 8h6m-6 4h6m-6 4h3" /></svg></span>
          <div className="row-info"><div className="row-title">{expense.item}</div><div className="row-sub">{expense.spentOn} · {expense.category?.name ?? '未分類'}</div></div>
          <div className="row-amount">{displayAmount(expense.amount)}<small>{expense.currencyCode}</small></div><span aria-hidden="true">→</span>
        </Link>)}</div>
        {expenses.error ? <p className="error" role="alert">暫時無法更新支出清單，已載入的紀錄仍保留。{!expenses.isFetchNextPageError ? <button type="button" className="text-btn" disabled={expenses.isFetching} onClick={() => { void expenses.refetch(); }}>重新更新清單</button> : null}</p> : null}
        {expenses.hasNextPage ? <div className="load-more"><button type="button" className="btn secondary" disabled={expenses.isFetching} onClick={() => { void expenses.fetchNextPage(); }}>{expenses.isFetchingNextPage ? '載入中…' : '載入更多'}</button></div> : null}
      </>}
    {editing ? <TripForm trip={trip.data} onClose={() => setEditing(false)} /> : null}
  </>;
}
