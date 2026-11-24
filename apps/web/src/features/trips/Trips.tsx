import { useTranslation } from 'react-i18next';
import { tripText } from './messages.js';
import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import { apiRequest, type Trip, type ItemList } from '../../api/index.js';
import { useSession } from '../auth/session.js';
import { QueryState } from '../../components/QueryState.js';
import { TripForm } from './TripForm.js';
import { TripThumbnail } from './TripThumbnail.js';
import { Button } from '../../components/ui/button.js';
import { ArrowRight, FileText, Plus } from 'lucide-react';

export function tripDates(trip: Pick<Trip, 'startDate' | 'endDate'>) {
  if (!trip.startDate && !trip.endDate) return tripText('tripDatesNotSet');

  return `${trip.startDate ?? tripText('startDateNotSet')} — ${trip.endDate ?? tripText('endDateNotSet')}`;
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

  return (
    <>
      {!creationResult ? (
        <div className="trips-page">
          <div className="mobile-trip-brand">t. {tripText('brand')}</div>
          <header className="page-head">
            <div>
              <div className="eyebrow">MY JOURNEYS</div>
              <h1 ref={heading} tabIndex={-1}>
                {tripText('everyTripHasAStory')}
              </h1>
              <p className="muted">{tripText('listSubtitle')}</p>
            </div>
            <Button onClick={() => setCreating(true)}>
              <Plus className="icon" size={19} strokeWidth={1.6} aria-hidden="true" />
              <span>{tripText('newTrip')}</span>
            </Button>
          </header>
          {messageKey || message ? (
            <p className="feedback" role="status">
              {messageKey ? t(messageKey) : message}
            </p>
          ) : null}
          {trips.isPending || trips.error ? (
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
          ) : trips.data.items.length ? (
            <div className="grid" role="region" aria-label={tripText('tripList')}>
              {trips.data.items.map((trip, index) => (
                <Link className="trip-card ds-trip-card" to={`/trips/${trip.id}`} key={trip.id}>
                  <div className={`landscape${index % 2 ? ' warm' : ''}`}>
                    {trip.hasThumbnail ? (
                      <TripThumbnail
                        key={`${account!.id}:${trip.id}:${trip.thumbnailRevision}`}
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
              ))}
            </div>
          ) : (
            <div className="empty">
              <h2>{tripText('startYourJourneyWithATripLedger')}</h2>
              <p>{tripText('createATripAndAddYourFirstExpense')}</p>
            </div>
          )}
          <p className="intro-note">
            <FileText className="icon" size={19} strokeWidth={1.6} aria-hidden="true" />
            <span>{tripText('listCurrencyNote')}</span>
          </p>
        </div>
      ) : null}
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
