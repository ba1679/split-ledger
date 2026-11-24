import { parseMoney } from '@split-ledger/shared';
import { apiRequest, ApiError, type Expense } from '../../api/index.js';
import type { TripState } from '../trips/management-api.js';
import { expenseMessage } from './messages.js';

export interface SaveIntent {
  kind: 'save';
  id: string;
  tripId: string;
  item: string;
  spentOn: string;
  currencyCode: string;
  minorUnit: number;
  amountMinor: string;
  categoryId: string | null;
  payerMemberId?: string;
  shareMemberIds?: string[];
}

export interface DeleteIntent {
  kind: 'delete';
  id: string;
  tripId: string;
}

export type WriteIntent = SaveIntent | DeleteIntent;

export function unconfirmedMessageKey(kind: WriteIntent['kind']) {
  return kind === 'save' ? 'unconfirmedSave' : 'unconfirmedDelete';
}

export class UnconfirmedWrite extends Error {
  constructor(
    readonly intent: WriteIntent,
    cause: unknown,
  ) {
    super(expenseMessage(unconfirmedMessageKey(intent.kind)), { cause });
  }
}

export class OfflineWrite extends Error {
  constructor(readonly kind: WriteIntent['kind']) {
    super(expenseMessage(kind === 'save' ? 'offlineSave' : 'offlineDelete'));
  }
}

export class UnavailableTrip extends Error {
  constructor(readonly state: TripState) {
    super(expenseMessage(state.state === 'trash' ? 'tripTrashed' : 'tripPurged'));
  }
}

export function definitelyRejected(error: unknown) {
  return error instanceof ApiError && error.status < 500;
}

export async function verifiedSave(intent: SaveIntent): Promise<Expense | null> {
  try {
    const saved = await apiRequest<Expense>(`/api/trips/${intent.tripId}/expenses/${intent.id}`);

    if (
      (!intent.payerMemberId || saved.payerMemberId === intent.payerMemberId) &&
      (!intent.shareMemberIds ||
        [...intent.shareMemberIds].sort().join() ===
          saved.shares
            .map((share) => share.memberId)
            .sort()
            .join()) &&
      saved.id === intent.id &&
      saved.tripId === intent.tripId &&
      saved.item === intent.item &&
      saved.spentOn === intent.spentOn &&
      saved.currencyCode === intent.currencyCode &&
      saved.minorUnit === intent.minorUnit &&
      (saved.category?.id ?? null) === intent.categoryId &&
      parseMoney(saved.amount, saved.minorUnit).toString() === intent.amountMinor
    )
      return saved;
  } catch {
    /* Even a 404 cannot establish the outcome of a potentially in-flight POST. */
  }

  return null;
}

export function currentTripState(tripId: string) {
  return apiRequest<TripState>(`/api/trips/${tripId}/state`, {
    signal: AbortSignal.timeout(5000),
  });
}

export async function verifiedDelete(
  intent: DeleteIntent,
  readState = () => currentTripState(intent.tripId),
) {
  let state: TripState;
  try {
    state = await readState();
  } catch {
    return false;
  }
  if (state.state !== 'active') throw new UnavailableTrip(state);

  try {
    await apiRequest<Expense>(`/api/trips/${intent.tripId}/expenses/${intent.id}`, {
      signal: AbortSignal.timeout(5000),
    });
  } catch (error) {
    const missing = error instanceof ApiError && error.status === 404;
    const hidden = error instanceof ApiError && error.code === 'TRIP_TRASHED';
    if (!missing && !hidden) return false;
    // A trip can become unavailable between the first state read and the expense read.
    let current: TripState;
    try {
      current = await readState();
    } catch {
      return false;
    }
    if (current.state !== 'active') throw new UnavailableTrip(current);

    return missing;
  }

  return false;
}
