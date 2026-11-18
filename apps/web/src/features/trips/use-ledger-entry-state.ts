import { useEffect, useState, type RefObject } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../api/index.js';
import { useSession } from '../auth/session.js';
import type { TripState } from './management-api.js';

/** Verify every ledger entry before showing cached accounting, including same-route re-entry. */
export function useLedgerEntryState(
  tripId: string | undefined,
  unavailableHeading: RefObject<HTMLHeadingElement | null>,
) {
  const { account } = useSession();
  const [entryId] = useState(() => crypto.randomUUID());
  const authority = useQuery({
    queryKey: ['account', account!.id, 'trip', tripId, 'entry-state', entryId],
    queryFn: ({ signal }) => apiRequest<TripState>(`/api/trips/${tripId}/state`, { signal }),
    retry: false,
    gcTime: 0,
  });
  useEffect(() => {
    if (
      authority.data?.state &&
      authority.data.state !== 'active' &&
      (!document.activeElement ||
        document.activeElement === document.body ||
        !document.activeElement.isConnected)
    ) {
      unavailableHeading.current?.focus({ preventScroll: true });
    }
  }, [authority.data?.state, unavailableHeading]);

  return authority;
}

/** Run after the ledger query hooks so cancellation keeps its established effect ordering. */
export function useUnavailableLedgerCleanup(
  tripId: string | undefined,
  state: TripState | undefined,
) {
  const { account } = useSession();
  const client = useQueryClient();
  useEffect(() => {
    if (!state || state.state === 'active') return;
    const predicate = (query: { queryKey: readonly unknown[] }) =>
      query.queryKey[0] === 'account' &&
      query.queryKey[1] === account!.id &&
      query.queryKey[2] !== 'expense-draft' &&
      query.queryKey.includes(tripId) &&
      !query.queryKey.includes('entry-state');
    void client.cancelQueries({ predicate }).then(() => client.removeQueries({ predicate }));
  }, [client, account, tripId, state]);
}
