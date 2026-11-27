import './trip-ledger-overview.css';
import { tripText } from './messages.js';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/button.js';
import React, { useEffect, useRef, useState } from 'react';
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
import { BusyIndicator } from '../../components/waiting/BusyIndicator.js';
import { ActionButton } from '../../components/waiting/ActionButton.js';
import { QueryState } from '../../components/QueryState.js';
import { tripDates } from './Trips.js';
import { displayAmount } from '../expenses/money.js';
import { formatShareAmount } from '../expenses/ExpenseShares.js';
import type { SettlementView } from '../settlement/types.js';
import { balanceStatus, formatBalanceAmount } from '../settlement/balance-status.js';
import { Icon } from '../../components/Icon.js';
import { useLedgerEntryState, useUnavailableLedgerCleanup } from './use-ledger-entry-state.js';
import { TripAccessState } from './TripAccessState.js';

function TripLedgerHeading({ trip }: { trip: Trip }) {
  const { t } = useTranslation();
  const sentinel = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const marker = sentinel.current;
    if (!marker) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry) setCompact(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
    observer.observe(marker);

    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div className="ledger-header-marker" ref={sentinel} aria-hidden="true" />
      <header
        className="ledger-page-header"
        aria-label={tripText('tripDetails')}
        role="region"
        data-compact={compact || undefined}
      >
        <div className="ledger-title">
          <h1 title={trip.name}>{trip.name}</h1>
        </div>
        <Button asChild className="ledger-desktop-add">
          <Link to={`/trips/${trip.id}/expenses/new`}>
            <Icon name="plus" />
            <span>{t('ledger.addExpense')}</span>
          </Link>
        </Button>
      </header>
      <p className="ledger-trip-dates muted">{tripDates(trip)}</p>
    </>
  );
}

function LedgerBalances({
  members,
  settlement,
}: {
  members: TripMember[];
  settlement: SettlementView;
}) {
  const { t, i18n } = useTranslation();
  const amountsByCurrency = new Map<
    string,
    Map<string, SettlementView['balances'][number]['netAmount']>
  >();
  for (const balance of settlement.balances) {
    const amounts = amountsByCurrency.get(balance.currencyCode) ?? new Map();
    amounts.set(balance.memberId, balance.netAmount);
    amountsByCurrency.set(balance.currencyCode, amounts);
  }

  return (
    <section aria-label={tripText('memberBalances')} className="ledger-balances">
      {amountsByCurrency.size === 0 ? (
        <p className="muted ledger-summary-empty">{tripText('noBalances')}</p>
      ) : null}
      {[...amountsByCurrency].map(([currency, amounts]) => {
        const settled =
          [...amounts.values()].every((amount) => BigInt(amount.numerator) === 0n) &&
          !settlement.arrangements.some((row) => row.currencyCode === currency);

        return settled ? (
          <p key={currency} className="muted ledger-balanced-currency">
            {tripText('balancedCurrency', { currency })}
          </p>
        ) : (
          <div key={currency} className="ledger-balance-currency">
            {members.map((member) => {
              const amount = amounts.get(member.id);
              const sign = BigInt(amount?.numerator ?? 0);
              const display = amount
                ? displayAmount(formatBalanceAmount(amount, i18n.resolvedLanguage))
                : '0';

              return (
                <div
                  className="ledger-balance-row"
                  key={member.id}
                  role="group"
                  aria-label={`${member.name} ${currency}`}
                >
                  <span>{member.name}</span>
                  <span className="muted">
                    {t(balanceStatus(sign, member.id, currency, settlement.arrangements))}
                  </span>
                  <strong className={sign > 0n ? 'receivable' : undefined}>
                    {currency} {display}
                  </strong>
                </div>
              );
            })}
          </div>
        );
      })}
    </section>
  );
}

export function TripLedger() {
  const { t } = useTranslation();
  const { tripId } = useParams(),
    { account } = useSession();
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
        `/api/trips/${tripId}/expenses?limit=20${pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : ''}`,
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
  if (authority.isPending || authority.error || authority.data.state !== 'active')
    return (
      <>
        <TripAccessState authority={authority} tripId={tripId!} heading={unavailableHeading} />
      </>
    );

  if (trip.isPending || trip.error)
    return (
      <>
        <QueryState
          label={tripText('tripDetails')}
          layout="summary"
          fetchStatus={trip.fetchStatus}
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
      <TripLedgerHeading trip={trip.data} />
      {location.state?.messageKey || location.state?.message ? (
        <p className="feedback" role="status">
          {location.state.messageKey ? t(location.state.messageKey) : location.state.message}
        </p>
      ) : null}
      <div className="ledger-overview">
        <section className="ledger-summary-card" aria-label={tripText('personalSpendingSummary')}>
          <div className="ledger-summary-heading">
            <h2>{tripText('personalSpending')}</h2>
            <Link className="ledger-analysis-link" to={`/trips/${tripId}/analysis`}>
              {tripText('viewAnalysis')} <Icon name="arrow" />
            </Link>
          </div>
          <p className="muted ledger-currency-note">{tripText('separateByCurrency')}</p>
          {totals.isPending || totals.error ? (
            <QueryState
              label={tripText('totalsByCurrency')}
              layout="summary"
              fetchStatus={totals.fetchStatus}
              pending={totals.isPending}
              error={totals.error}
              retry={() => {
                void totals.refetch();
              }}
            />
          ) : totals.data.totals.length ? (
            <section className="ledger-currency-totals" aria-label={tripText('totalsByCurrency')}>
              {totals.data.totals.map((total) => (
                <div
                  className="ledger-currency-row"
                  role="group"
                  aria-label={total.currencyCode}
                  key={total.currencyCode}
                >
                  <span>{total.currencyCode}</span>
                  <strong className="total-value">
                    {displayAmount(formatShareAmount(total.amount, total.amount.minorUnit))}
                  </strong>
                </div>
              ))}
            </section>
          ) : (
            <p className="muted ledger-summary-empty">{tripText('noPersonalSpending')}</p>
          )}
        </section>
        <section className="ledger-summary-card" aria-label={tripText('balanceSummary')}>
          <div className="ledger-summary-heading">
            <h2>{tripText('balancesDue')}</h2>
          </div>
          {members.data && settlement.data ? (
            <LedgerBalances members={members.data.items} settlement={settlement.data} />
          ) : (
            <QueryState
              label={tripText('balancesDue')}
              layout="summary"
              fetchStatus={
                members.isFetching || settlement.isFetching
                  ? 'fetching'
                  : members.fetchStatus === 'paused' || settlement.fetchStatus === 'paused'
                    ? 'paused'
                    : 'idle'
              }
              pending={members.isPending || settlement.isPending}
              error={members.error ?? settlement.error}
              retry={() => {
                if (members.error || members.isPaused) void members.refetch();
                if (settlement.error || settlement.isPaused) void settlement.refetch();
              }}
            />
          )}
        </section>
      </div>
      {expenses.isPending || !expenses.data ? (
        <>
          {expenses.isPending && expenses.fetchStatus !== 'paused' ? (
            <div className="section-head" aria-hidden="true">
              <span className="list-heading-skeleton" />
              <span className="list-count-skeleton" />
            </div>
          ) : null}
          <QueryState
            label={tripText('expenseList')}
            layout="list"
            fetchStatus={expenses.fetchStatus}
            pending={expenses.isPending}
            error={expenses.error}
            retry={() => {
              void expenses.refetch();
            }}
          />
        </>
      ) : totalCount === 0 ? (
        <div className="empty">
          <Icon name="note" />
          <h2>{tripText('aBlankPageForYourJourney')}</h2>
          <p>{tripText('startWithAFlightTicketOrTodayS')}</p>
          <Button asChild variant="default">
            <Link to={`/trips/${trip.data.id}/expenses/new`}>
              {tripText('addYourFirstExpense')}
            </Link>
          </Button>
        </div>
      ) : (
        <>
          <section className="ledger-expenses" aria-label={tripText('expenseList')}>
            <div className="section-head">
              <h2>{tripText('expensesAlongTheWay')}</h2>
              <span className="ledger-record-count">
                {tripText('recordCount', { count: totalCount })}
                {expenses.isFetching && !expenses.isFetchingNextPage ? (
                  <span aria-busy="true">
                    <BusyIndicator accessibleLabel={tripText('updatingExpenseList')} />
                  </span>
                ) : null}
              </span>
            </div>
            {expenses.error ? (
              <p className="error" role="alert">
                {tripText('couldNotUpdateTheExpenseListLoadedRecords')}
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
                    {tripText('updateListAgain')}
                  </Button>
                ) : null}
              </p>
            ) : null}
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
                      <span>{expense.category?.name ?? tripText('uncategorized')}</span>
                    </div>
                  </div>{' '}
                  <div className="row-amount">
                    {expense.currencyCode} {displayAmount(expense.amount)}
                  </div>
                  <Icon name="arrow" />
                </Link>
              ))}
            </div>
          </section>
          {expenses.hasNextPage ? (
            <div className="load-more">
              <ActionButton
                type="button"
                variant="outline"
                label={tripText('loadMore')}
                busyLabel={tripText('loadingMoreExpenses')}
                busy={expenses.isFetchingNextPage}
                disabled={expenses.isFetching}
                onClick={() => {
                  if (!expenses.isFetching) void expenses.fetchNextPage({ cancelRefetch: false });
                }}
              />
            </div>
          ) : null}
        </>
      )}
    </>
  );
}
