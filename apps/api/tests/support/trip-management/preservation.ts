import { expect, type APIResponse } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import type { TripManagementSnapshot } from './context.js';
import type { RecordedTripCommand } from './commands.js';
import { managementSnapshot, managementTripId, sharedSnapshot } from './baseline.js';
import { independentSplittingOracle } from '../splitting/expense-fixture.js';

export async function ownerRead(world: LedgerWorld, path: string) {
  return world.api.get(path, { headers: { cookie: world.users.get('Alice')!.cookie } });
}

export function tripBusinessFields(row: Record<string, unknown>) {
  const {
    deleted_at: _deleted,
    lifecycle_revision: _revision,
    updated_at: _updated,
    ...business
  } = row;

  return business;
}

export async function assertPreservedTrip(
  world: LedgerWorld,
  response: Pick<APIResponse, 'status'> = world.response!,
): Promise<void> {
  const before = world.get<TripManagementSnapshot>('management:before');
  const after = await managementSnapshot(world);
  const tripId = managementTripId(world);

  expect(response.status()).toBe(200);
  expect(before.trips).toHaveLength(1);
  expect(after.trips.map(tripBusinessFields)).toEqual(before.trips.map(tripBusinessFields));
  for (const key of [
    'members',
    'expenses',
    'shares',
    'repayments',
    'settlements',
    'adjustments',
    'thumbnails',
    'reservations',
  ] as const)
    expect(after[key], `All original ${key} fields and stable IDs must be preserved`).toEqual(
      before[key],
    );
  const members = before.members.map((row) => String(row.id));
  const currencies = new Set(before.expenses.map((row) => String(row.currency_code)));
  for (const currency of currencies)
    for (const member of members)
      expect(
        independentSplittingOracle.equal(
          independentSplittingOracle.balance(after, member, currency),
          independentSplittingOracle.balance(before, member, currency),
        ),
        `Independent ${currency} balance for ${member}`,
      ).toBe(true);
  if (world.state.has('management:lastCommand')) {
    const command = world.get<RecordedTripCommand>('management:lastCommand');
    const newReceipts = after.receipts.filter(
      (row) => !before.receipts.some((prior) => prior.operation_id === row.operation_id),
    );

    expect(newReceipts).toHaveLength(1);
    expect(newReceipts[0]).toMatchObject({
      operation_id: command.operationId,
      kind: command.kind,
      trip_id: tripId,
    });
    expect(after.receipts.filter((row) => row.operation_id !== command.operationId)).toEqual(
      before.receipts,
    );
  } else expect(after.receipts).toEqual(before.receipts);
  const row = after.trips[0]!;
  const state = await ownerRead(world, `/api/trips/${tripId}/state`);

  expect(state.status()).toBe(200);
  expect(await state.json()).toEqual({
    state: row.deleted_at === null ? 'active' : 'trash',
    lifecycleRevision: String(row.lifecycle_revision),
    thumbnailRevision: String(row.thumbnail_revision),
    hasThumbnail: after.thumbnails.length === 1,
  });
  if (row.deleted_at === null) {
    const trip = await ownerRead(world, `/api/trips/${tripId}`);

    expect(trip.status()).toBe(200);
    expect(await trip.json()).toMatchObject({
      id: tripId,
      name: before.trips[0]!.name,
      expenseCount: before.expenses.length,
      lifecycleRevision: String(row.lifecycle_revision),
      thumbnailRevision: String(row.thumbnail_revision),
      accountingRevision: String(row.accounting_revision),
      hasThumbnail: true,
    });
  }
  expect(
    await managementSnapshot(world),
    'Read-only verification must not change authoritative data',
  ).toEqual(after);
}

export async function assertOtherDataUnchanged(world: LedgerWorld): Promise<void> {
  const before = world.get<Awaited<ReturnType<typeof sharedSnapshot>>>('management:sharedBefore');

  expect(
    await sharedSnapshot(world),
    'Other travel, image, accounting, categories, users and currencies',
  ).toEqual(before);
  for (const [snapshot, owner] of [
    [before.other, 'Alice'],
    [before.outsider, 'Carol'],
  ] as const) {
    const row = snapshot.trips[0]!;
    const response = await world.api.get(`/api/trips/${String(row.id)}`, {
      headers: { cookie: world.users.get(owner)!.cookie },
    });

    expect(response.status()).toBe(200);
    expect(await response.json()).toMatchObject({
      id: row.id,
      name: row.name,
      expenseCount: snapshot.expenses.length,
      accountingRevision: String(row.accounting_revision),
      lifecycleRevision: String(row.lifecycle_revision),
      thumbnailRevision: String(row.thumbnail_revision),
      hasThumbnail: snapshot.thumbnails.length === 1,
    });
  }
  expect(await sharedSnapshot(world), 'Owner re-reads are side-effect free').toEqual(before);
}
