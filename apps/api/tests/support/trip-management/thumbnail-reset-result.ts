import { expect, type APIResponse } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import type { TripManagementSnapshot } from './context.js';
import type { RecordedTripCommand } from './commands.js';
import { managementSnapshot, sharedSnapshot } from './baseline.js';
import { ownerRead } from './preservation.js';
import { expectedCurrentState } from './rejections.js';

export async function assertThumbnailReset(
  world: LedgerWorld,
  response: Pick<APIResponse, 'status' | 'json'> = world.response!,
  command: RecordedTripCommand = world.get<RecordedTripCommand>('management:lastCommand'),
): Promise<void> {
  const before = world.get<TripManagementSnapshot>('management:before');
  const after = await managementSnapshot(world);

  expect(command.kind).toBe('reset_thumbnail');
  expect(response.status()).toBe(200);
  expect(after.thumbnails).toEqual([]);
  expect(after.trips).toHaveLength(1);
  const row = after.trips[0]!,
    prior = before.trips[0]!;
  const revision = String(BigInt(String(prior.thumbnail_revision)) + 1n);
  const unchanged = (value: Record<string, unknown>) => {
    const { thumbnail_revision: _thumbnail, updated_at: _updated, ...rest } = value;

    return rest;
  };

  expect(unchanged(row)).toEqual(unchanged(prior));
  expect(String(row.thumbnail_revision)).toBe(revision);
  const result = {
    operationId: command.operationId,
    kind: 'reset_thumbnail',
    state: 'active',
    lifecycleRevision: String(prior.lifecycle_revision),
    thumbnailRevision: revision,
    thumbnailPresent: false,
  };

  expect(await response.json()).toEqual({
    result,
    currentState: expectedCurrentState(after),
  });
  const receipt = after.receipts.filter((value) => value.operation_id === command.operationId);

  expect(receipt).toHaveLength(1);
  expect(receipt[0]).toMatchObject({
    trip_id: command.tripId,
    owner_id: row.owner_id,
    kind: 'reset_thumbnail',
    result_state: 'active',
    result_lifecycle_revision: String(prior.lifecycle_revision),
    result_thumbnail_revision: revision,
    result_thumbnail_present: false,
  });
  expect(after.receipts).toHaveLength(before.receipts.length + 1);
  expect(after.receipts.filter((value) => value.operation_id !== command.operationId)).toEqual(
    before.receipts,
  );
  for (const key of [
    'members',
    'expenses',
    'shares',
    'repayments',
    'settlements',
    'adjustments',
    'reservations',
    'categories',
  ] as const)
    expect(after[key]).toEqual(before[key]);
  for (const version of [String(prior.thumbnail_revision), revision]) {
    const missing = await ownerRead(world, `/api/trips/${command.tripId}/thumbnail/${version}`);

    expect(missing.status()).toBe(404);
    expect(await missing.json()).toMatchObject({ code: 'NOT_FOUND' });
  }
  const trip = await ownerRead(world, `/api/trips/${command.tripId}`);

  expect(trip.status()).toBe(200);
  expect(await trip.json()).toMatchObject({
    id: command.tripId,
    hasThumbnail: false,
    thumbnailRevision: revision,
    lifecycleRevision: String(prior.lifecycle_revision),
    accountingRevision: String(prior.accounting_revision),
  });
  expect(await managementSnapshot(world)).toEqual(after);
  expect(await sharedSnapshot(world)).toEqual(world.get('management:sharedBefore'));
}
