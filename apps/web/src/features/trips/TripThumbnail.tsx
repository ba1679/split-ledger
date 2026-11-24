import { tripText, useTripText } from './messages.js';
import React, { useState } from 'react';
import { LoaderCircle } from 'lucide-react';

export function TripThumbnail({ src, children }: { src: string; children?: React.ReactNode }) {
  useTripText();
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  if (failed)
    return (
      <>
        {children ?? (
          <span className="word" aria-hidden="true">
            JOURNEY
          </span>
        )}
        <span className="trip-thumbnail-fallback">
          {tripText('imageFailedToLoadShowingDefault')}
        </span>
      </>
    );

  return (
    <>
      <img
        className="trip-thumbnail"
        src={src}
        alt=""
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
      />
      {!loaded ? (
        <span
          className="trip-thumbnail-status"
          role="status"
          aria-label={tripText('loadingTripThumbnail')}
        >
          <LoaderCircle size={24} className="action-spinner" aria-hidden="true" />
        </span>
      ) : null}
    </>
  );
}
