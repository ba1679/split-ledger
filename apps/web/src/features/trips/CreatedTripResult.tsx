import { tripText, useTripText } from './messages.js';
import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Mountain } from 'lucide-react';
import type { Trip } from '../../api/index.js';
import { ActionButton } from '../../components/waiting/ActionButton.js';

export function CreatedTripResult({
  trip,
  error,
  busy,
  unknown,
  currentImageAvailable,
  draftName,
  onRetry,
  onVerify,
}: {
  trip: Trip;
  error: string | null;
  busy: boolean;
  unknown: boolean;
  currentImageAvailable: boolean;
  draftName?: string;
  onRetry: () => void;
  onVerify: () => void;
}) {
  useTripText();
  const heading = useRef<HTMLHeadingElement>(null);
  const previousError = useRef(error);

  useEffect(() => {
    if (error) previousError.current = error;
  }, [error]);

  const reservedError = !error && busy ? previousError.current : null;

  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className="created-trip-result">
      <div className="mobile-trip-brand">t. {tripText('brand')}</div>
      <header>
        <div className="eyebrow">MY JOURNEYS</div>
        <h1 ref={heading} tabIndex={-1}>
          {tripText('tripCreated')}
        </h1>
        <p>{tripText('youCanStartAddingExpensesToName', { name: trip.name })}</p>
      </header>
      <section className="created-image-feedback" role={unknown ? 'status' : 'alert'}>
        <div>
          <h2>
            {unknown
              ? tripText('tripCreatedImageResultUnconfirmed')
              : tripText('tripCreatedButTheImageWasNotSaved')}
          </h2>
          <p>
            {unknown ? (
              tripText('checkTheOriginalImageOperationDoNotResend')
            ) : !currentImageAvailable ? (
              tripText('yourTripAndLedgerAreSavedButThe')
            ) : trip.hasThumbnail ? (
              tripText('yourTripLedgerAndCurrentImageAreSaved')
            ) : (
              <>
                {tripText('yourTripAndLedgerAreSavedTheDefault')}
                <span className="desktop-created-detail">
                  {tripText('noNeedToCreateTheTripAgain')}
                </span>
              </>
            )}
          </p>
          {error || reservedError ? (
            <p
              aria-hidden={reservedError ? true : undefined}
              style={reservedError ? { visibility: 'hidden' } : undefined}
            >
              {error ?? reservedError}
            </p>
          ) : null}
          {unknown && draftName ? (
            <p>{tripText('photoDraftNameAwaitingVerification', { name: draftName })}</p>
          ) : null}
        </div>
        <ActionButton
          busy={busy}
          label={unknown ? tripText('checkAgain') : tripText('uploadAgain')}
          busyLabel={unknown ? tripText('checkingImageSave') : tripText('uploadingImageAgain')}
          onClick={() => {
            if (!busy) (unknown ? onVerify : onRetry)();
          }}
        />
      </section>
      <h2 className="created-trip-section-title">{tripText('createdTrip')}</h2>
      <Link className="trip-card create-result-card" to={`/trips/${trip.id}`}>
        {unknown || !currentImageAvailable ? (
          <div
            className="created-trip-image created-image-unknown"
            role="img"
            aria-label={
              unknown
                ? tripText('imageSaveResultUnconfirmed')
                : tripText('currentImageTemporarilyUnavailable')
            }
          >
            {unknown
              ? tripText('imageResultUnconfirmed')
              : tripText('currentImageTemporarilyUnavailable')}
          </div>
        ) : trip.hasThumbnail ? (
          <div className="created-trip-image">
            <img
              src={`/api/trips/${trip.id}/thumbnail/${trip.thumbnailRevision}`}
              alt={tripText('thumbnailForName', { name: trip.name })}
            />
          </div>
        ) : (
          <div
            className="created-trip-image thumbnail-default"
            role="img"
            aria-label={tripText('defaultTripThumbnail')}
          >
            <Mountain size={48} aria-hidden="true" />
          </div>
        )}
        <div className="card-content">
          <h2>{trip.name}</h2>
          <p className="card-date">
            {trip.startDate || trip.endDate
              ? `${trip.startDate ?? tripText('startDateNotSet')} — ${trip.endDate ?? tripText('endDateNotSet')}`
              : tripText('tripDatesNotSet')}
          </p>
          <div className="card-bottom">
            <span>{tripText('expenseCount', { count: trip.expenseCount })}</span>
            <span>
              {tripText('openTripLedger')} <ArrowRight size={14} aria-hidden="true" />
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}
