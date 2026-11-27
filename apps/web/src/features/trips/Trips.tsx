import { useTranslation } from 'react-i18next';
import { tripText } from './messages.js';
import React, { useState, useEffect, useRef } from 'react';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import { apiRequest, type Trip, type ItemList } from '../../api/index.js';
import { useSession } from '../auth/session.js';
import { QueryState } from '../../components/QueryState.js';
import { TripForm } from './TripForm.js';
import { TripManagementMenu } from './TripManagementMenu.js';
import { useTripListManagement } from './use-trip-list-management.js';
import { TripThumbnail } from './TripThumbnail.js';
import { Button } from '../../components/ui/button.js';
import { ArrowRight, FileText, Plus, Trash2 } from 'lucide-react';

export function tripDates(trip: Pick<Trip, 'startDate' | 'endDate'>) {
  if (!trip.startDate && !trip.endDate) return tripText('tripDatesNotSet');

  return `${trip.startDate ?? tripText('startDateNotSet')} — ${trip.endDate ?? tripText('endDateNotSet')}`;
}

function TripListCard({
  trip,
  accountId,
  warm,
  onManage,
}: {
  trip: Trip;
  accountId: string;
  warm: boolean;
  onManage: React.ComponentProps<typeof TripManagementMenu>['onSelect'];
}) {
  return (
    <article className="trip-list-card">
      <Link className="trip-card ds-trip-card" to={`/trips/${trip.id}`}>
        <div className={`landscape${warm ? ' warm' : ''}`}>
          {trip.hasThumbnail ? (
            <TripThumbnail
              key={`${accountId}:${trip.id}:${trip.thumbnailRevision}`}
              src={`/api/trips/${trip.id}/thumbnail/${trip.thumbnailRevision}`}
            />
          ) : (
            <span className="word" aria-hidden="true">
              JOURNEY
            </span>
          )}
        </div>
        <div className="card-content">
          <div className="card-top">
            <h2>{trip.name}</h2>
            <ArrowRight className="icon" size={19} strokeWidth={1.6} aria-hidden="true" />
          </div>
          <p className="card-date">{tripDates(trip)}</p>
          <div className="card-bottom">
            <span>{tripText('expenseCount', { count: trip.expenseCount })}</span>
            <span>{tripText('openTripLedger')}</span>
          </div>
        </div>
      </Link>
      <TripManagementMenu tripName={trip.name} onSelect={onManage} />
    </article>
  );
}

function TripList({
  trips,
  accountId,
  onManage,
}: {
  trips: UseQueryResult<ItemList<Trip>>;
  accountId: string;
  onManage: ReturnType<typeof useTripListManagement>['select'];
}) {
  if (trips.isPending || trips.error) {
    return (
      <QueryState
        label={tripText('tripList')}
        pendingMessage={tripText('loadingYourTrips')}
        layout="cards"
        fetchStatus={trips.fetchStatus}
        pending={trips.isPending}
        error={trips.error}
        retry={() => {
          void trips.refetch();
        }}
      />
    );
  }
  if (!trips.data.items.length) {
    return (
      <div className="empty">
        <h2>{tripText('startYourJourneyWithATripLedger')}</h2>
        <p>{tripText('createATripAndAddYourFirstExpense')}</p>
      </div>
    );
  }

  return (
    <div className="grid" role="region" aria-label={tripText('tripList')}>
      {trips.data.items.map((trip, index) => (
        <TripListCard
          key={trip.id}
          trip={trip}
          accountId={accountId}
          warm={index % 2 === 1}
          onManage={(action) => onManage(action, trip)}
        />
      ))}
    </div>
  );
}

export function Trips() {
  const { t } = useTranslation();
  const { account } = useSession();
  const location = useLocation();
  const heading = useRef<HTMLHeadingElement>(null);
  const { messageKey, message } =
    (location.state as { messageKey?: string; message?: string } | null) ?? {};
  useEffect(() => {
    if (messageKey || message) heading.current?.focus();
  }, [messageKey, message]);
  const [creating, setCreating] = useState(false);
  const [creationResult, setCreationResult] = useState(false);
  const trips = useQuery({
    queryKey: ['account', account!.id, 'trips'],
    queryFn: ({ signal }) => apiRequest<ItemList<Trip>>('/api/trips', { signal }),
  });

  const management = useTripListManagement(trips.data?.items, heading);
  const feedbackKey = management.messageKey ?? messageKey;
  const feedback = feedbackKey ? t(feedbackKey) : message;

  return (
    <>
      {!creationResult ? (
        <div className="trips-page">
          <header className="page-head trips-list-header">
            <div>
              <h1 ref={heading} tabIndex={-1}>
                {tripText('myTrips')}
              </h1>
              <p className="muted">{tripText('everyTripHasAStory')}</p>
            </div>
            <div className="trips-list-actions">
              <Button asChild variant="outline">
                <Link to="/trips/trash">
                  <Trash2 aria-hidden="true" />
                  {tripText('trash')}
                </Link>
              </Button>
              <Button onClick={() => setCreating(true)}>
                <Plus className="icon" size={19} strokeWidth={1.6} aria-hidden="true" />
                <span>{tripText('newTrip')}</span>
              </Button>
            </div>
          </header>
          {feedback ? (
            <p className="feedback" role="status">
              {feedback}
            </p>
          ) : null}
          <TripList trips={trips} accountId={account!.id} onManage={management.select} />
          <p className="intro-note">
            <FileText className="icon" size={19} strokeWidth={1.6} aria-hidden="true" />
            <span>{tripText('listCurrencyNote')}</span>
          </p>
        </div>
      ) : null}
      {management.dialogs}
      {creating ? (
        <TripForm
          onClose={() => {
            setCreating(false);
            setCreationResult(false);
          }}
          onCreationResult={() => setCreationResult(true)}
        />
      ) : null}
    </>
  );
}
