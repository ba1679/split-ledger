import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import type { TripManagementSnapshot } from './context.js';
import { managementSnapshot, managementTripId, sharedSnapshot } from './baseline.js';
import { ownerRead } from './preservation.js';

export const managementErrorStatuses = {
  NOT_FOUND: 404,
  UNAUTHENTICATED: 401,
  REQUEST_ORIGIN_REJECTED: 403,
  VALIDATION_ERROR: 400,
  TRIP_NOT_TRASHED: 409,
  TRIP_TRASHED: 409,
  TRIP_PURGED: 409,
  TRIP_STATE_CHANGED: 409,
  THUMBNAIL_UPDATED: 409,
  OPERATION_ID_CONFLICT: 409,
  ID_CONFLICT: 409,
} as const;

export function expectedCurrentState(snapshot: TripManagementSnapshot) {
  const row = snapshot.trips[0];

  if (!row) {
    expect(snapshot.reservations).toHaveLength(1);
    expect(snapshot.reservations[0]!.purged_at).not.toBeNull();

    return {
      state: 'purged',
      lifecycleRevision: null,
      thumbnailRevision: null,
      hasThumbnail: null,
    };
  }

  return {
    state: row.deleted_at === null ? 'active' : 'trash',
    lifecycleRevision: String(row.lifecycle_revision),
    thumbnailRevision: String(row.thumbnail_revision),
    hasThumbnail: snapshot.thumbnails.length === 1,
  };
}

export async function assertRejectedCommand(world: LedgerWorld, code: string): Promise<void> {
  expect(Object.keys(managementErrorStatuses)).toContain(code);
  const response = world.response!;

  expect(response.status()).toBe(
    managementErrorStatuses[code as keyof typeof managementErrorStatuses],
  );
  const body = await response.json();

  expect(body).toMatchObject({ code, message: expect.any(String) });
  expect(body.message.length).toBeGreaterThan(0);
  const before = world.get<TripManagementSnapshot>('management:before');
  const shared = world.get<Awaited<ReturnType<typeof sharedSnapshot>>>('management:sharedBefore');

  expect(
    await managementSnapshot(world),
    'Rejection leaves all rows, bytes, revisions and receipts unchanged',
  ).toEqual(before);
  expect(await sharedSnapshot(world)).toEqual(shared);
  const serialized = JSON.stringify(body);
  for (const row of shared.outsider.trips)
    for (const field of ['id', 'owner_id', 'name'])
      expect(serialized, 'Error must not disclose other-account travel').not.toContain(
        String(row[field]),
      );
  const tripId = managementTripId(world);
  const state = await ownerRead(world, `/api/trips/${tripId}/state`);

  expect(state.status()).toBe(200);
  expect(await state.json()).toEqual(expectedCurrentState(before));
  if (before.trips[0]?.deleted_at === null) {
    const trip = await ownerRead(world, `/api/trips/${tripId}`);

    expect(trip.status()).toBe(200);
    expect(await trip.json()).toMatchObject({
      id: tripId,
      name: before.trips[0]!.name,
      accountingRevision: String(before.trips[0]!.accounting_revision),
      thumbnailRevision: String(before.trips[0]!.thumbnail_revision),
    });
  }
  expect(await managementSnapshot(world)).toEqual(before);
  expect(await sharedSnapshot(world)).toEqual(shared);
}
