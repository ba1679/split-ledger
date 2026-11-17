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
import { TripOperationCheck } from './TripOperationCheck.js';
import { useLifecycleCommand, lifecycleOutcomeMessage, type TrashTrip } from './management-api.js';

function TrashCard({
  trip,
  onMessage,
  onRetain,
  onRelease,
  visible,
  onFocusRecovery,
}: {
  trip: TrashTrip;
  onMessage: (message: string) => void;
  onRetain: () => void;
  onRelease: () => void;
  visible: boolean;
  onFocusRecovery: () => void;
}) {
  const { account } = useSession();
  const purgeTrigger = useRef<HTMLButtonElement>(null);
  const [confirming, setConfirming] = useState(false);
  const [purgeUnknown, setPurgeUnknown] = useState(false);
  const restore = useLifecycleCommand(
    trip,
    'restore',
    (result, verified) =>
      onMessage(
        verified ? lifecycleOutcomeMessage(result) : '旅行已復原，可以從我的旅行重新開啟。',
      ),
    undefined,
    onRelease,
  );
  const purgeDialog = (
    <TripCommandDialog
      key={`${account!.id}:${trip.id}`}
      trip={trip}
      operation="purge"
      open={confirming}
      onSubmit={onRetain}
      onRejected={onRelease}
      onUnknownChange={setPurgeUnknown}
      onClose={() => {
        setConfirming(false);
        requestAnimationFrame(() => {
          if (purgeTrigger.current?.isConnected)
            purgeTrigger.current.focus({ preventScroll: true });
          else onFocusRecovery();
        });
      }}
      onComplete={(result, verified) => {
        setConfirming(false);
        onMessage(verified ? lifecycleOutcomeMessage(result) : '旅行已永久刪除。');
      }}
    />
  );
  const restoreOutcome = restore.unknown ? (
    <section className="operation-outcome" role="status">
      <p>「{trip.name}」復原結果尚未確認，請先查證原次操作。</p>
      <TripOperationCheck
        busy={restore.isPending}
        onCheck={restore.verify}
        busyLabel="正在查證旅行復原"
      />
    </section>
  ) : null;
  if (!visible)
    return (
      <>
        {purgeDialog}
        {restoreOutcome}
      </>
    );

  return (
    <>
      {purgeDialog}
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
              disabled={restore.isPending || restore.unknown || purgeUnknown || confirming}
              aria-busy={restore.isPending}
              aria-label={restore.isPending ? '正在復原旅行' : undefined}
              onClick={() => {
                onRetain();
                restore.submit();
              }}
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
              ref={purgeTrigger}
              disabled={restore.isPending || restore.unknown || confirming}
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
          {restoreOutcome}
          {!restore.unknown && restore.error ? (
            <p className="error" role="alert">
              {restore.error.message}
            </p>
          ) : null}
        </div>
      </article>
    </>
  );
}

export function TrashTrips() {
  const { account } = useSession();
  const [message, setMessage] = useState('');
  const [retained, setRetained] = useState<TrashTrip[]>([]);
  const heading = useRef<HTMLHeadingElement>(null);
  const trash = useQuery({
    queryKey: ['account', account!.id, 'trips', 'trash'],
    queryFn: ({ signal }) => apiRequest<ItemList<TrashTrip>>('/api/trips/trash', { signal }),
  });
  const items = trash.data?.items ?? [];
  const liveIds = new Set(items.map((trip) => trip.id));
  // Submitted operations survive a background refresh removing their original row.
  const cards = [...items, ...retained.filter((trip) => !liveIds.has(trip.id))];

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
          label="垃圾桶"
          layout="media"
          fetchStatus={trash.fetchStatus}
          pending={trash.isPending}
          error={trash.error}
          retry={() => {
            void trash.refetch();
          }}
        />
      ) : null}
      {items.length ? <p className="trash-count">{items.length} 趟已刪旅行</p> : null}
      <div
        className="trash-cards"
        role="region"
        aria-label={
          trash.isPending || trash.error || !cards.length ? undefined : '已移入垃圾桶的旅行'
        }
      >
        {cards.map((trip) => (
          <TrashCard
            key={trip.id}
            trip={trip}
            visible={liveIds.has(trip.id)}
            onFocusRecovery={() => heading.current?.focus({ preventScroll: true })}
            onRetain={() =>
              setRetained((current) =>
                current.some((row) => row.id === trip.id) ? current : [...current, trip],
              )
            }
            onRelease={() => setRetained((current) => current.filter((row) => row.id !== trip.id))}
            onMessage={(message) => {
              setMessage(message);
              setRetained((current) => current.filter((row) => row.id !== trip.id));
              heading.current?.focus();
            }}
          />
        ))}
      </div>
      {items.length ? (
        <p className="trash-note">移入垃圾桶不會結清欠款，也不會變更旅行帳務。</p>
      ) : null}
      {!cards.length && !trash.isPending && !trash.error ? (
        <div className="empty" role="region" aria-label="已移入垃圾桶的旅行">
          <h2>沒有已刪旅行</h2>
          <p>移至垃圾桶的旅行會保留在這裡，直到你選擇復原或永久刪除。</p>
        </div>
      ) : null}
    </div>
  );
}
