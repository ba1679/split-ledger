import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest, ApiError } from '../../api/index.js';
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

export function lifecycleOutcomeMessageKey(outcome: OperationOutcome) {
  const action =
    outcome.result.kind === 'move_to_trash'
      ? 'Trash'
      : outcome.result.kind === 'purge'
        ? 'Purge'
        : 'Restore';
  const state =
    outcome.currentState.state === 'active'
      ? 'Active'
      : outcome.currentState.state === 'trash'
        ? 'InTrash'
        : 'Purged';

  return `lifecycle${action}${state}`;
}

export function useLifecycleCommand(
  trip: ManagedTrip,
  operation: LifecycleOperation,
  onComplete: (result: OperationOutcome, verified?: boolean) => void,
  onUnknownChange?: (unknown: boolean) => void,
  onRejected?: () => void,
) {
  const { account } = useSession();
  const client = useQueryClient();
  const [operationId, setOperationId] = useState(() => crypto.randomUUID());
  const [unknown, setUnknown] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const unknownLock = useRef(false);
  const verificationLock = useRef(false);
  const locked = useRef(false);
  const sameOwner = () => client.getQueryData<{ id: string }>(['session'])?.id === account!.id;

  async function complete(result: OperationOutcome, verified = false): Promise<void> {
    if (!sameOwner()) return;
    const matches = (query: { queryKey: readonly unknown[] }) =>
      query.queryKey[0] === 'account' &&
      query.queryKey[1] === account!.id &&
      query.queryKey[2] !== 'expense-draft' &&
      query.queryKey.slice(2).includes(trip.id);
    await client.cancelQueries({ predicate: matches });
    if (!sameOwner()) return;
    client.removeQueries({ predicate: matches });
    await Promise.all([
      client.invalidateQueries({ queryKey: ['account', account!.id, 'trips'] }),
      client.invalidateQueries({ queryKey: ['account', account!.id, 'categories'] }),
    ]);
    if (!sameOwner()) return;
    setUnknown(false);
    onUnknownChange?.(false);
    unknownLock.current = false;
    mutation.reset();
    setOperationId(crypto.randomUUID());
    onComplete(result, verified);
  }

  async function verify(): Promise<void> {
    if (verificationLock.current || !sameOwner()) return;
    verificationLock.current = true;
    setVerifying(true);
    try {
      const [receipt, current] = await Promise.allSettled([
        apiRequest<OperationOutcome>(`/api/trips/${trip.id}/operations/${operationId}`, {
          signal: AbortSignal.timeout(5000),
        }),
        apiRequest<TripState>(`/api/trips/${trip.id}/state`, {
          signal: AbortSignal.timeout(5000),
        }),
      ]);
      if (!sameOwner() || receipt.status !== 'fulfilled' || current.status !== 'fulfilled') return;
      const expectedKind = operation === 'trash' ? 'move_to_trash' : operation;
      if (
        receipt.value.result.operationId !== operationId ||
        receipt.value.result.kind !== expectedKind
      )
        return;
      await complete({ ...receipt.value, currentState: current.value }, true);
    } catch {
      // A missing receipt or unavailable read cannot prove the original command failed.
    } finally {
      verificationLock.current = false;
      if (sameOwner()) setVerifying(false);
    }
  }

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
        signal: AbortSignal.timeout(75000),
      }),
    onSuccess: (result) => complete(result),
    onError: async (failure) => {
      if (failure instanceof ApiError && failure.status < 500) {
        if (sameOwner()) onRejected?.();

        return;
      }
      unknownLock.current = true;
      setUnknown(true);
      onUnknownChange?.(true);
      await verify();
    },
    onSettled: () => {
      locked.current = false;
    },
  });

  return {
    ...mutation,
    unknown,
    verify,
    isPending: mutation.isPending || verifying,
    submit() {
      if (!locked.current && !unknownLock.current) {
        locked.current = true;
        mutation.mutate();
      }
    },
  };
}
