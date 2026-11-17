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
  if (!trip.startDate && !trip.endDate) return '旅行日期未定';

  return `${trip.startDate ?? '開始日未定'} — ${trip.endDate ?? '結束日未定'}`;
}

export function Trips() {
  const { account } = useSession();
  const location = useLocation();
  const heading = useRef<HTMLHeadingElement>(null);
  const message = (location.state as { message?: string } | null)?.message;
  useEffect(() => {
    if (message) heading.current?.focus();
  }, [message]);
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
          <div className="mobile-trip-brand">t. 旅帳</div>
          <header className="page-head">
            <div>
              <div className="eyebrow">MY JOURNEYS</div>
              <h1 ref={heading} tabIndex={-1}>
                每一趟，都有故事。
              </h1>
              <p className="muted">把沿途的小花費，留在各自的旅行裡。</p>
            </div>
            <Button onClick={() => setCreating(true)}>
              <Plus className="icon" size={19} strokeWidth={1.6} aria-hidden="true" />
              <span>新增旅行</span>
            </Button>
          </header>
          {(location.state as { message?: string } | null)?.message ? (
            <p className="feedback" role="status">
              {(location.state as { message: string }).message}
            </p>
          ) : null}
          {trips.isPending || trips.error ? (
            <QueryState
              label="旅行清單"
              pendingMessage="正在整理你的旅程…"
              layout="cards"
              fetchStatus={trips.fetchStatus}
              pending={trips.isPending}
              error={trips.error}
              retry={() => {
                void trips.refetch();
              }}
            />
          ) : trips.data.items.length ? (
            <div className="grid" role="region" aria-label="旅行清單">
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
                      <span>{trip.expenseCount} 筆支出</span>
                      <span>開啟旅行帳本</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty">
              <h2>旅程，從第一本帳本開始。</h2>
              <p>建立一趟旅行，記下你的第一筆支出。</p>
            </div>
          )}
          <p className="intro-note">
            <FileText className="icon" size={19} strokeWidth={1.6} aria-hidden="true" />
            <span>不同幣別各自統計，保留每筆支出原本的樣子。</span>
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
