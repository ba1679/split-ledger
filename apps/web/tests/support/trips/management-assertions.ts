import { expect } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import type { TripManagementSnapshot } from '../../../../api/tests/support/trip-management/context.js';
import {
  managementSnapshot,
  managementTripId,
  sharedSnapshot,
} from '../../../../api/tests/support/trip-management/baseline.js';
import { ownerRead } from '../../../../api/tests/support/trip-management/preservation.js';
import { managementUI, waitForManagementReads } from './management-fixture.js';

export async function assertManagementUnchanged(
  world: LedgerWorld,
  allowedWrites = 0,
): Promise<void> {
  const ui = managementUI(world);
  await waitForManagementReads(ui);
  expect(ui.writes, 'Only the explicitly observed command may be sent').toHaveLength(allowedWrites);
  const before = world.get<TripManagementSnapshot>('management:before');

  expect(await managementSnapshot(world)).toEqual(before);
  expect(await sharedSnapshot(world)).toEqual(world.get('management:sharedBefore'));
  const trip = before.trips[0]!;
  const state = await ownerRead(world, `/api/trips/${managementTripId(world)}/state`);

  expect(state.status()).toBe(200);
  expect(await state.json()).toEqual({
    state: trip.deleted_at === null ? 'active' : 'trash',
    lifecycleRevision: String(trip.lifecycle_revision),
    thumbnailRevision: String(trip.thumbnail_revision),
    hasThumbnail: before.thumbnails.length === 1,
  });
  const path =
    trip.deleted_at === null ? `/api/trips/${managementTripId(world)}` : `/api/trips/trash`;
  const response = await ownerRead(world, path);

  expect(response.status()).toBe(200);
  const body = await response.json();
  const item =
    trip.deleted_at === null ? body : body.items.find((row: { id: string }) => row.id === trip.id);

  expect(item).toMatchObject({
    id: trip.id,
    name: trip.name,
    hasThumbnail: true,
    lifecycleRevision: String(trip.lifecycle_revision),
    thumbnailRevision: String(trip.thumbnail_revision),
  });
  const imagePath =
    trip.deleted_at === null
      ? `/api/trips/${managementTripId(world)}`
      : `/api/trips/trash/${managementTripId(world)}`;
  const image = await ownerRead(world, `${imagePath}/thumbnail/${String(trip.thumbnail_revision)}`);

  expect(image.status()).toBe(200);
  expect(await image.body()).toEqual(before.thumbnails[0]!.image_webp);
  expect(await managementSnapshot(world)).toEqual(before);
}
