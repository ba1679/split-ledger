import { useSyncExternalStore } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '../auth/session.js';
import { apiRequest, type Trip } from '../../api/index.js';
import type { TripState } from './management-api.js';

/** Cached metadata is available only while every current ledger entry agrees it is active. */
export function useAvailableTrip(tripId: string | undefined) {
  const { account } = useSession();
  const client = useQueryClient();
  const entryStateKey = ['account', account!.id, 'trip', tripId, 'entry-state'];
  const entryUnavailable = useSyncExternalStore(
    (notify) => client.getQueryCache().subscribe(notify),
    () =>
      client
        .getQueriesData<TripState>({ queryKey: entryStateKey })
        .some(([, state]) => state?.state !== 'active'),
  );
  const trip = useQuery({
    queryKey: ['account', account!.id, 'trip', tripId],
    queryFn: ({ signal }) => apiRequest<Trip>(`/api/trips/${tripId}`, { signal }),
    enabled: Boolean(tripId),
    retry: false,
  });

  return trip.error || entryUnavailable ? undefined : trip.data;
}
