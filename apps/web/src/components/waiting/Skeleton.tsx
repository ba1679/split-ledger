import React from 'react';
import type { SkeletonProps } from './types.js';

export function Skeleton({ layout, accessibleLabel, caption }: SkeletonProps) {
  return (
    <div
      className={`query-skeleton query-skeleton-${layout}`}
      role="status"
      aria-label={accessibleLabel}
    >
      {caption ? <p className="skeleton-caption">{caption}</p> : null}
      <div aria-hidden="true" data-skeleton className={layout === 'cards' ? 'grid' : undefined}>
        {layout === 'cards' || layout === 'media' ? (
          [0, 1].map((card) => (
            <div className="skeleton-card" key={card}>
              <div className="skeleton-image" />
              <div className="skeleton-card-copy">
                <div className="skeleton-line" />
                <div className="skeleton-line short" />
                <div className="skeleton-line short" />
              </div>
            </div>
          ))
        ) : layout === 'form' ? (
          <>
            <div className="skeleton-form-heading">
              <div className="skeleton-value" />
              <div className="skeleton-line short" />
            </div>
            <div className="skeleton-fields">
              {[0, 1, 2].map((row) => (
                <div className="skeleton-field" key={row}>
                  <div className="skeleton-line short" />
                  <div className="skeleton-input" />
                </div>
              ))}
            </div>
          </>
        ) : layout === 'list' ? (
          [0, 1, 2].map((row) => (
            <div className="skeleton-row" key={row}>
              <div className="skeleton-line" />
              <div className="skeleton-line short" />
            </div>
          ))
        ) : (
          <>
            <div className="skeleton-line short" />
            <div className="skeleton-value" />
            <div className="skeleton-line" />
          </>
        )}
      </div>
    </div>
  );
}
