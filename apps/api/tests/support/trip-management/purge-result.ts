import { expect, type APIResponse } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import type { TripManagementSnapshot } from './context.js';
import type { RecordedTripCommand } from './commands.js';
import { managementSnapshot, managementTripId } from './baseline.js';
import { ownerRead } from './preservation.js';
import { ownerTripPages } from './lifecycle-result.js';
import { expectedCurrentState } from './rejections.js';

export async function assertPurgedTrip(
  world: LedgerWorld,
  response: Pick<APIResponse, 'status' | 'json'> = world.response!,
  command: RecordedTripCommand = world.get<RecordedTripCommand>('management:lastCommand'),
): Promise<void> {
  const tripId = managementTripId(world);
  const before = world.get<TripManagementSnapshot>('management:before');

  expect(command.kind).toBe('purge');
  expect(response.status()).toBe(200);
  const after = await managementSnapshot(world);

  for (const key of [
    'trips',
    'members',
    'expenses',
    'shares',
    'repayments',
    'settlements',
    'adjustments',
    'thumbnails',
  ] as const)
    expect(after[key], `200 is only valid after all ${key} are committed absent`).toEqual([]);
  expect(after.reservations).toHaveLength(1);
  const reservation = after.reservations[0]!;
  const priorReservation = before.reservations[0]!;

  expect(Object.keys(reservation).sort()).toEqual([
    'owner_id',
    'purged_at',
    'reserved_at',
    'trip_id',
  ]);
  expect(reservation).toMatchObject({
    trip_id: tripId,
    owner_id: priorReservation.owner_id,
    reserved_at: priorReservation.reserved_at,
  });
  expect(priorReservation.purged_at).toBeNull();
  expect(reservation.purged_at).not.toBeNull();
  expect(new Date(String(reservation.purged_at)).getTime()).not.toBeNaN();
  const receipts = after.receipts.filter((row) => row.operation_id === command.operationId);
  const lifecycleRevision = String(BigInt(String(before.trips[0]!.lifecycle_revision)) + 1n);
  const thumbnailRevision = String(before.trips[0]!.thumbnail_revision);

  expect(after.receipts).toHaveLength(before.receipts.length + 1);
  expect(after.receipts.filter((row) => row.operation_id !== command.operationId)).toEqual(
    before.receipts,
  );
  expect(receipts).toHaveLength(1);
  const receipt = receipts[0]!;

  expect(Object.keys(receipt).sort()).toEqual(
    [
      'owner_id',
      'operation_id',
      'trip_id',
      'kind',
      'request_fingerprint',
      'result_state',
      'result_lifecycle_revision',
      'result_thumbnail_revision',
      'result_thumbnail_present',
      'created_at',
    ].sort(),
  );
  expect(receipt).toMatchObject({
    owner_id: priorReservation.owner_id,
    operation_id: command.operationId,
    trip_id: tripId,
    kind: 'purge',
    result_state: 'purged',
    result_lifecycle_revision: lifecycleRevision,
    result_thumbnail_revision: thumbnailRevision,
    result_thumbnail_present: null,
  });
  expect(Buffer.isBuffer(receipt.request_fingerprint)).toBe(true);
  expect((receipt.request_fingerprint as Buffer).length).toBe(32);
  const expected = {
    result: {
      operationId: command.operationId,
      kind: 'purge',
      state: 'purged',
      lifecycleRevision,
      thumbnailRevision,
      thumbnailPresent: null,
    },
    currentState: expectedCurrentState(after),
  };

  expect(await response.json()).toEqual(expected);
  const state = await ownerRead(world, `/api/trips/${tripId}/state`);

  expect(state.status()).toBe(200);
  expect(await state.json()).toEqual(expected.currentState);
  const operation = await ownerRead(
    world,
    `/api/trips/${tripId}/operations/${command.operationId}`,
  );

  expect(operation.status()).toBe(200);
  expect(await operation.json()).toEqual(expected);
  for (const scope of ['active', 'trash'] as const)
    expect((await ownerTripPages(world, scope)).some((row) => row.id === tripId)).toBe(false);
  for (const path of [
    `/api/trips/${tripId}`,
    `/api/trips/${tripId}/thumbnail/${thumbnailRevision}`,
    `/api/trips/trash/${tripId}/thumbnail/${thumbnailRevision}`,
  ]) {
    const response = await ownerRead(world, path);

    expect(response.status()).toBe(404);
    expect(await response.json()).toMatchObject({ code: 'NOT_FOUND' });
  }
  // No second mutation in Then: B006-010 separately proves restore is rejected after this state.
  expect(after.trips, 'No recoverable travel row remains').toEqual([]);
  expect(await managementSnapshot(world)).toEqual(after);
}
