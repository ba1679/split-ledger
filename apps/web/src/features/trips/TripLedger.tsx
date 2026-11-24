import { MobileLanguageBar } from '../../components/LanguageMenu.js';
import { tripText } from './messages.js';
import { useTranslation } from 'react-i18next';
import './analysis-entry.css';
import { TripManagementMenu } from './TripManagementMenu.js';
import { Button } from '../../components/ui/button.js';
import React, { useRef, useState } from 'react';
import { ChartPie } from 'lucide-react';
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
import { TripForm } from './TripForm.js';
import { displayAmount } from '../expenses/money.js';
import { formatShareAmount } from '../expenses/ExpenseShares.js';
import type { SettlementView } from '../settlement/types.js';
import { balanceStatus, formatBalanceAmount } from '../settlement/balance-status.js';
import { Icon } from '../../components/Icon.js';
import { useLedgerEntryState, useUnavailableLedgerCleanup } from './use-ledger-entry-state.js';
import { useLedgerManagement } from './use-ledger-management.js';
import { TripAccessState } from './TripAccessState.js';

export function TripLedger() {
  const { t, i18n } = useTranslation();
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
        <MobileLanguageBar>
          <Link className="back" to="/trips">
            <Icon name="back" />
            <span>{tripText('myTrips')}</span>
          </Link>
        </MobileLanguageBar>
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
      {lifecycleDialog}
      {thumbnailDialog}
      <MobileLanguageBar>
        <Link className="back" to="/trips">
          <Icon name="back" />
          <span>{tripText('myTrips')}</span>
        </Link>
      </MobileLanguageBar>
      <header className="page-head" role="region" aria-label={tripText('tripDetails')}>
        <div>
          <div className="eyebrow">TRAVEL JOURNAL</div>
          <h1>{trip.data.name}</h1>
          <p className="muted">
            <span>{tripDates(trip.data)}</span>
            <Button variant="ghost" className="text-btn" onClick={() => setEditing(true)}>
              {tripText('tripDates')}
            </Button>
          </p>
        </div>
        <div className="ledger-actions">
          <Button asChild variant="default">
            <Link to={`/trips/${trip.data.id}/expenses/new`}>
              <Icon name="plus" />
              <span>{t('ledger.addExpense')}</span>
            </Link>
          </Button>
          <TripManagementMenu
            onSelect={(action) => {
              openManagement(action, trip.data);
            }}
          />
        </div>
      </header>
      <div className="ledger-analysis-navigation">
        <nav aria-label={tripText('tripNavigation')} className="trip-navigation">
          <Button asChild variant="outline">
            <Link to={`/trips/${tripId}/members`}>
              <Icon name="members" />
              {t('common.members')}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to={`/trips/${tripId}/settlement`}>
              <Icon name="settlement" />
              {t('ledger.settlement')}
            </Link>
          </Button>
        </nav>
        <Button asChild variant="outline" className="analysis-entry">
          <Link to={`/trips/${tripId}/analysis`}>
            <ChartPie size={20} strokeWidth={1.6} aria-hidden="true" />
            {t('common.spendingAnalysis')}
          </Link>
        </Button>
      </div>
      {location.state?.messageKey || location.state?.message ? (
        <p className="feedback" role="status">
          {location.state.messageKey ? t(location.state.messageKey) : location.state.message}
        </p>
      ) : null}
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
        <>
          <div className="section-head">
            <span>{tripText('myTotalExpensesByCurrency')}</span>
          </div>
          <section className="totals" aria-label={tripText('totalsByCurrency')}>
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
        <section aria-label={tripText('memberBalances')} className="balance-grid">
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
                        <span>
                          {t(
                            balanceStatus(sign, member.id, currency, settlement.data!.arrangements),
                          )}
                        </span>
                      </span>
                      <strong className={sign > 0n ? 'receivable' : undefined}>
                        {currency} {formatBalanceAmount(amount, i18n.resolvedLanguage)}
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
          <section aria-label={tripText('expenseList')}>
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
      {editing ? <TripForm trip={trip.data} onClose={() => setEditing(false)} /> : null}
    </>
  );
}
