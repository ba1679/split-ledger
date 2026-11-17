import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LoaderCircle, Mountain } from 'lucide-react';
import { apiRequest, type ItemList } from '../../api/index.js';
import { useSession } from '../auth/session.js';
import { Button } from '../../components/ui/button.js';
import { Icon } from '../../components/Icon.js';
import { QueryState } from '../../components/QueryState.js';
import { TripCommandDialog } from './TripCommandDialog.js';
import { TripThumbnail } from './TripThumbnail.js';
import { useLifecycleCommand, type TrashTrip } from './management-api.js';

function TrashCard({ trip, onMessage }: { trip: TrashTrip; onMessage: (message: string) => void }) {
  const { account } = useSession();
  const [confirming, setConfirming] = useState(false);
  const restore = useLifecycleCommand(trip, 'restore', () =>
    onMessage('旅行已復原，可以從我的旅行重新開啟。'),
  );

  return (
    <article className="trash-card">
      <div className="trash-card-image">
        {trip.hasThumbnail ? (
          <TripThumbnail
            key={`${account!.id}:${trip.id}:${trip.thumbnailRevision}`}
            src={`/api/trips/trash/${trip.id}/thumbnail/${trip.thumbnailRevision}`}
          >
            <Mountain size={52} strokeWidth={1.8} aria-hidden="true" />
          </TripThumbnail>
        ) : (
          <Mountain size={52} strokeWidth={1.8} aria-hidden="true" />
        )}
      </div>
      <div className="trash-card-content">
        <h2>{trip.name}</h2>
        <p>
          移入垃圾桶：
          {new Intl.DateTimeFormat('zh-TW', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          }).format(new Date(trip.deletedAt))}
        </p>
        <div className="trash-card-actions">
          <Button
            disabled={restore.isPending}
            aria-busy={restore.isPending}
            aria-label={restore.isPending ? '正在復原旅行' : undefined}
            onClick={restore.submit}
          >
            {restore.isPending ? (
              <LoaderCircle size={20} className="action-spinner" aria-hidden="true" />
            ) : (
              '復原旅行'
            )}
          </Button>
          <Button
            variant="ghost"
            className="trash-purge"
            disabled={restore.isPending}
            onClick={(event) => {
              // Safari pointer clicks do not focus buttons by default. Establish the
              // real opener before the modal captures its return-focus target.
              event.currentTarget.focus({ preventScroll: true });
              setConfirming(true);
            }}
          >
            永久刪除
          </Button>
        </div>
        {restore.error ? (
          <p className="error" role="alert">
            {restore.error.message}
          </p>
        ) : null}
      </div>
      {confirming ? (
        <TripCommandDialog
          trip={trip}
          operation="purge"
          onClose={() => setConfirming(false)}
          onComplete={() => {
            setConfirming(false);
            onMessage('旅行已永久刪除。');
          }}
        />
      ) : null}
    </article>
  );
}

export function TrashTrips() {
  const { account } = useSession();
  const [message, setMessage] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  const trash = useQuery({
    queryKey: ['account', account!.id, 'trips', 'trash'],
    queryFn: ({ signal }) => apiRequest<ItemList<TrashTrip>>('/api/trips/trash', { signal }),
  });

  return (
    <div className="trash-page">
      <Link className="back" to="/trips">
        <Icon name="back" />
        <span>我的旅行</span>
      </Link>
      <header className="page-head">
        <div>
          <div className="eyebrow">TRIP TRASH</div>
          <h1 ref={heading} tabIndex={-1}>
            垃圾桶
          </h1>
          <p className="muted">旅行會保留在這裡，直到你選擇復原或永久刪除。</p>
        </div>
      </header>
      {message ? (
        <p className="feedback" role="status">
          {message}
        </p>
      ) : null}
      {trash.isPending || trash.error ? (
        <QueryState
          pending={trash.isPending}
          error={trash.error}
          retry={() => {
            void trash.refetch();
          }}
        />
      ) : trash.data.items.length ? (
        <>
          <p className="trash-count">{trash.data.items.length} 趟已刪旅行</p>
          <div className="trash-cards">
            {trash.data.items.map((trip) => (
              <TrashCard
                key={trip.id}
                trip={trip}
                onMessage={(message) => {
                  setMessage(message);
                  heading.current?.focus();
                }}
              />
            ))}
          </div>
          <p className="trash-note">移入垃圾桶不會結清欠款，也不會變更旅行帳務。</p>
        </>
      ) : (
        <div className="empty">
          <h2>沒有已刪旅行</h2>
          <p>移至垃圾桶的旅行會保留在這裡，直到你選擇復原或永久刪除。</p>
        </div>
      )}
    </div>
  );
}
