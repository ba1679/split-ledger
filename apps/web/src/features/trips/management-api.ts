import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../api/index.js';
import { useSession } from '../auth/session.js';

export interface ManagedTrip {
  id: string;
  name: string;
  lifecycleRevision: string;
  thumbnailRevision: string;
  hasThumbnail: boolean;
}

export interface TrashTrip extends ManagedTrip {
  deletedAt: string;
}

export type TripState =
  | {
      state: 'active' | 'trash';
      lifecycleRevision: string;
      thumbnailRevision: string;
      hasThumbnail: boolean;
    }
  | { state: 'purged'; lifecycleRevision: null; thumbnailRevision: null; hasThumbnail: null };

export interface OperationOutcome {
  result: {
    operationId: string;
    kind: string;
    state: TripState['state'];
    lifecycleRevision: string;
    thumbnailRevision: string;
    thumbnailPresent: boolean | null;
  };
  currentState: TripState;
}

export type LifecycleOperation = 'trash' | 'restore' | 'purge';

export function useLifecycleCommand(
  trip: ManagedTrip,
  operation: LifecycleOperation,
  onComplete: (result: OperationOutcome) => void,
) {
  const { account } = useSession();
  const client = useQueryClient();
  const [operationId] = useState(() => crypto.randomUUID());
  const locked = useRef(false);
  const mutation = useMutation({
    retry: false,
    mutationFn: () =>
      apiRequest<OperationOutcome>(`/api/trips/${trip.id}/${operation}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          operationId,
          expectedLifecycleRevision: trip.lifecycleRevision,
        }),
      }),
    onSuccess: async (result) => {
      const matches = (query: { queryKey: readonly unknown[] }) =>
        query.queryKey[0] === 'account' &&
        query.queryKey[1] === account!.id &&
        query.queryKey.slice(2).includes(trip.id);
      await client.cancelQueries({ predicate: matches });
      client.removeQueries({ predicate: matches });
      await Promise.all([
        client.invalidateQueries({ queryKey: ['account', account!.id, 'trips'] }),
        client.invalidateQueries({ queryKey: ['account', account!.id, 'categories'] }),
      ]);
      onComplete(result);
    },
    onSettled: () => {
      locked.current = false;
    },
  });

  return {
    ...mutation,
    submit() {
      if (!locked.current) {
        locked.current = true;
        mutation.mutate();
      }
    },
  };
}
