import { expect, type APIResponse } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import type { TripManagementSnapshot } from './context.js';
import type { RecordedTripCommand } from './commands.js';
import { managementSnapshot, managementTripId } from './baseline.js';
import { ownerRead } from './preservation.js';
import { expectedCurrentState } from './rejections.js';

export async function ownerTripPages(world: LedgerWorld, scope: 'active' | 'trash') {
  const path = scope === 'active' ? '/api/trips' : '/api/trips/trash';
  const items: Record<string, unknown>[] = [];
  const cursors = new Set<string>();
  let cursor: string | null = null;
  do {
    const query = new URLSearchParams({ limit: '1' });

    if (cursor !== null) query.set('cursor', cursor);
    const response = await ownerRead(world, `${path}?${query}`);

    expect(response.status()).toBe(200);
    const body = await response.json();

    expect(Array.isArray(body.items)).toBe(true);
    expect(body.items.length).toBeLessThanOrEqual(1);
    expect(body.nextCursor === null || typeof body.nextCursor === 'string').toBe(true);
    items.push(...body.items);
    cursor = body.nextCursor;
    if (cursor !== null) {
      expect(cursor.length).toBeGreaterThan(0);
      expect(cursors.has(cursor), 'Pagination cursor must advance').toBe(false);
      cursors.add(cursor);
    }
  } while (cursor !== null);
  expect(new Set(items.map((row) => row.id)).size, 'No page may repeat a trip').toBe(items.length);

  return items;
}

export async function assertLifecycleTransition(
  world: LedgerWorld,
  state: 'active' | 'trash',
  response: Pick<APIResponse, 'status' | 'json'> = world.response!,
  command: RecordedTripCommand = world.get<RecordedTripCommand>('management:lastCommand'),
): Promise<void> {
  const before = world.get<TripManagementSnapshot>('management:before');
  const tripId = managementTripId(world);
  const after = await managementSnapshot(world);

  expect(response.status()).toBe(200);
  expect(before.trips).toHaveLength(1);
  expect(after.trips).toHaveLength(1);
  const prior = before.trips[0]!,
    row = after.trips[0]!;
  const revision = BigInt(String(prior.lifecycle_revision)) + 1n;
  const kind = state === 'trash' ? 'move_to_trash' : 'restore';

  expect(command.kind).toBe(kind);
  expect(row.id).toBe(prior.id);
  expect(row.owner_id).toBe(prior.owner_id);
  expect(row.deleted_at === null).toBe(state === 'active');
  if (state === 'trash') {
    expect(prior.deleted_at).toBeNull();
    expect(new Date(String(row.deleted_at)).getTime()).not.toBeNaN();
  } else expect(prior.deleted_at).not.toBeNull();
  expect(String(row.lifecycle_revision)).toBe(String(revision));
  expect(String(row.thumbnail_revision)).toBe(String(prior.thumbnail_revision));
  expect(String(row.accounting_revision)).toBe(String(prior.accounting_revision));
  const result = {
    operationId: command.operationId,
    kind,
    state,
    lifecycleRevision: String(revision),
    thumbnailRevision: String(prior.thumbnail_revision),
    thumbnailPresent: null,
  };
  const current = expectedCurrentState(after);

  expect(await response.json()).toEqual({ result, currentState: current });
  const receipt = after.receipts.filter((value) => value.operation_id === command.operationId);

  expect(receipt).toHaveLength(1);
  expect(receipt[0]).toMatchObject({
    owner_id: prior.owner_id,
    trip_id: tripId,
    kind,
    result_state: state,
    result_lifecycle_revision: String(revision),
    result_thumbnail_revision: String(prior.thumbnail_revision),
    result_thumbnail_present: null,
  });
  expect(Buffer.isBuffer(receipt[0]!.request_fingerprint)).toBe(true);
  expect((receipt[0]!.request_fingerprint as Buffer).length).toBe(32);
  expect(after.receipts).toHaveLength(before.receipts.length + 1);
  expect(after.receipts.filter((value) => value.operation_id !== command.operationId)).toEqual(
    before.receipts,
  );
  const stateRead = await ownerRead(world, `/api/trips/${tripId}/state`);

  expect(stateRead.status()).toBe(200);
  expect(await stateRead.json()).toEqual(current);
  const active = await ownerTripPages(world, 'active');
  const trash = await ownerTripPages(world, 'trash');

  expect(active.some((value) => value.id === tripId)).toBe(state === 'active');
  expect(trash.some((value) => value.id === tripId)).toBe(state === 'trash');
  expect(await managementSnapshot(world), 'All verification queries are read-only').toEqual(after);
}
