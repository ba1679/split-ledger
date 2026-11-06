import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiRequest, type Trip, type ItemList } from '../../api/index.js';
import { useSession } from '../auth/session.js';
import { QueryState } from '../../components/QueryState.js';
import { TripForm } from './TripForm.js';
import { Icon } from '../../components/Icon.js';

export function tripDates(trip: Pick<Trip, 'startDate' | 'endDate'>) {
  if (!trip.startDate && !trip.endDate) return '旅行日期未定';

  return `${trip.startDate ?? '開始日未定'} — ${trip.endDate ?? '結束日未定'}`;
}

export function Trips() {
  const { account } = useSession();
  const [creating, setCreating] = useState(false);
  const trips = useQuery({
    queryKey: ['account', account!.id, 'trips'],
    queryFn: ({ signal }) => apiRequest<ItemList<Trip>>('/api/trips', { signal }),
  });

  return (
    <>
      <header className="page-head">
        <div>
          <div className="eyebrow">MY JOURNEYS</div>
          <h1>每一趟，都有故事。</h1>
          <p className="muted">把沿途的小花費，留在各自的旅行裡。</p>
        </div>
        <button className="btn" onClick={() => setCreating(true)}>
          <Icon name="plus" />
          <span>新增旅行</span>
        </button>
      </header>
      {trips.isPending || trips.error ? (
        <QueryState
          pending={trips.isPending}
          error={trips.error}
          retry={() => {
            void trips.refetch();
          }}
        />
      ) : trips.data.items.length ? (
        <div className="grid">
          {trips.data.items.map((trip, index) => (
            <Link className="trip-card" to={`/trips/${trip.id}`} key={trip.id}>
              <div className={`landscape${index % 2 ? ' warm' : ''}`} aria-hidden="true">
                <span className="word">JOURNEY</span>
              </div>
              <div className="card-content">
                <div className="card-top">
                  <h2>{trip.name}</h2>
                  <Icon name="arrow" />
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
        <Icon name="note" />
        <span>不同幣別各自統計，保留每筆支出原本的樣子。</span>
      </p>
      {creating ? <TripForm onClose={() => setCreating(false)} /> : null}
    </>
  );
}
