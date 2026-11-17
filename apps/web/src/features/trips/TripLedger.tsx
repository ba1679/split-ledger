import { TripCommandDialog, ThumbnailEntryDialog } from './TripCommandDialog.js';
import { TripManagementMenu } from './TripManagementMenu.js';
import { Button } from '../../components/ui/button.js';
import React, { useEffect, useRef, useState } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useParams, useNavigate } from 'react-router-dom';
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
import { lifecycleOutcomeMessage, type TripState, type ManagedTrip } from './management-api.js';
import { expenseDraftKey, type RetainedExpenseDraft } from '../expenses/expense-draft.js';

export function TripLedger() {
  const { tripId } = useParams(),
    { account } = useSession();
  const [editing, setEditing] = useState(false);
  const [managementDialog, setManagementDialog] = useState<'thumbnail' | 'trash' | null>(null);
  const [commandTrip, setCommandTrip] = useState<ManagedTrip | null>(null);
  const [thumbnailTrip, setThumbnailTrip] = useState<ManagedTrip | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const client = useQueryClient();
  const unavailableHeading = useRef<HTMLHeadingElement>(null);

  function closeManagement() {
    setManagementDialog(null);
    requestAnimationFrame(() => {
      if (document.activeElement === document.body)
        unavailableHeading.current?.focus({ preventScroll: true });
    });
  }

  // Each ledger entry verifies authority afresh before exposing cached accounting.
  const [entryId] = useState(() => crypto.randomUUID());
  const authority = useQuery({
    queryKey: ['account', account!.id, 'trip', tripId, 'entry-state', entryId],
    queryFn: ({ signal }) => apiRequest<TripState>(`/api/trips/${tripId}/state`, { signal }),
    retry: false,
    gcTime: 0,
  });
  useEffect(() => {
    if (
      authority.data?.state &&
      authority.data.state !== 'active' &&
      (!document.activeElement ||
        document.activeElement === document.body ||
        !document.activeElement.isConnected)
    ) {
      unavailableHeading.current?.focus({ preventScroll: true });
    }
  }, [authority.data?.state]);
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
  useEffect(() => {
    if (!authority.data || authority.data.state === 'active') return;
    const predicate = (query: { queryKey: readonly unknown[] }) =>
      query.queryKey[0] === 'account' &&
      query.queryKey[1] === account!.id &&
      query.queryKey[2] !== 'expense-draft' &&
      query.queryKey.includes(tripId) &&
      !query.queryKey.includes('entry-state');
    void client.cancelQueries({ predicate }).then(() => client.removeQueries({ predicate }));
  }, [client, account, tripId, authority.data]);
  const retainedDraft = client.getQueryData<RetainedExpenseDraft>(
    expenseDraftKey(account!.id, tripId!),
  );
  const lifecycleDialog = commandTrip ? (
    <TripCommandDialog
      key={`${account!.id}:${commandTrip.id}`}
      trip={commandTrip}
      operation="trash"
      open={managementDialog === 'trash'}
      onClose={closeManagement}
      onComplete={(result, verified) => {
        setCommandTrip(null);
        setManagementDialog(null);
        navigate('/trips', {
          state: {
            message: verified
              ? lifecycleOutcomeMessage(result)
              : '旅行已移至垃圾桶，可從垃圾桶復原。',
          },
        });
      }}
    />
  ) : null;
  const thumbnailDialog = thumbnailTrip ? (
    <ThumbnailEntryDialog
      key={`${account!.id}:${thumbnailTrip.id}`}
      trip={trip.data ?? thumbnailTrip}
      open={managementDialog === 'thumbnail'}
      availability={authority.data?.state ?? 'active'}
      onClose={closeManagement}
    />
  ) : null;

  if (authority.isPending || authority.error)
    return (
      <>
        {lifecycleDialog}
        {thumbnailDialog}
        <QueryState
          pending={authority.isPending}
          error={authority.error}
          retry={() => {
            void authority.refetch();
          }}
        />
      </>
    );

  if (authority.data.state !== 'active')
    return (
      <>
        {lifecycleDialog}
        {thumbnailDialog}
        <section className="state">
          <h1 ref={unavailableHeading} tabIndex={-1}>
            {authority.data.state === 'trash' ? '旅行已在垃圾桶' : '找不到這趟旅行'}
          </h1>
          <p>
            {authority.data.state === 'trash'
              ? '請先從垃圾桶復原，再繼續記帳。'
              : '旅行已永久刪除，無法再開啟帳本。'}
          </p>
          <Link to={authority.data.state === 'trash' ? '/trips/trash' : '/trips'}>
            {authority.data.state === 'trash' ? '前往垃圾桶復原' : '返回旅行清單'}
          </Link>
          {retainedDraft ? (
            <section role="region" aria-label="尚未保存的支出草稿">
              <h2>尚未保存的支出草稿</h2>
              <p>{retainedDraft.item}</p>
              <p>
                {retainedDraft.amount} {retainedDraft.currencyCode}
              </p>
              <p>{retainedDraft.spentOn}</p>
            </section>
          ) : null}
        </section>
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
              if (action === 'trash') setCommandTrip(trip.data);
              if (action === 'thumbnail') setThumbnailTrip(trip.data);
              setManagementDialog(action);
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
