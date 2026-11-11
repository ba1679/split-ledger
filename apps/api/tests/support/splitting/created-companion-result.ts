import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import { callApi } from '../seed.js';
import { snapshotSplittingSources } from './expense-fixture.js';
import { splittingTripId } from './members-fixture.js';
import type { SourceSnapshot } from './types.js';

export const createdCompanionResultPhrase = '新增同行者以名稱 {string} 保存';

export function assertCreatedCompanionSources(
  before: SourceSnapshot,
  after: SourceSnapshot,
  expected: { id: string; tripId: string; ownerId: string; name: string },
): void {
  expect(expected.name).toBe(expected.name.trim());
  expect(before.members.some((row) => row.id === expected.id)).toBe(false);
  expect(after.members).toHaveLength(before.members.length + 1);
  expect(after.members.find((row) => row.id === expected.id)).toMatchObject({
    id: expected.id,
    trip_id: expected.tripId,
    owner_id: expected.ownerId,
    name: expected.name,
    name_key: expected.name.replace(/[A-Z]/g, (letter) => letter.toLowerCase()),
    role: 'companion',
    is_active: true,
  });
  expect(after.members.filter((row) => row.id !== expected.id)).toEqual(before.members);
  for (const key of ['expenses', 'shares', 'repayments', 'settlements', 'adjustments'] as const)
    expect(after[key]).toEqual(before[key]);
  expect(after.trips).toHaveLength(before.trips.length);
  for (const trip of before.trips) {
    const current = after.trips.find((row) => row.id === trip.id);
    expect(current).toBeDefined();
    expect(BigInt(String(current!.accounting_revision))).toBe(
      BigInt(String(trip.accounting_revision)) + (trip.id === expected.tripId ? 1n : 0n),
    );
    expect(current).toEqual({
      ...trip,
      accounting_revision: current!.accounting_revision,
      updated_at: current!.updated_at,
    });
  }
}

export async function assertCreatedCompanion(world: LedgerWorld, name: string): Promise<void> {
  expect(world.response!.status(), 'Creating a companion must return 201').toBe(201);
  const id = world.get<string>('splitting:reservedMemberId');
  const tripId = splittingTripId(world);
  const before = world.get<SourceSnapshot>('splitting:before');
  const after = await snapshotSplittingSources(world);
  assertCreatedCompanionSources(before, after, {
    id,
    tripId,
    ownerId: world.get<string>('splitting:ownerId'),
    name,
  });
  const expected = { id, tripId, role: 'companion', name, isActive: true };
  expect(world.get('splitting:reply')).toMatchObject(expected);
  const single = await callApi(world, 'GET', `/api/trips/${tripId}/members/${id}`);
  expect(single.status()).toBe(200);
  expect(await single.json()).toMatchObject(expected);
  const list = await callApi(world, 'GET', `/api/trips/${tripId}/members`);
  expect(list.status()).toBe(200);
  const items = ((await list.json()) as { items: { id: string }[] }).items;
  expect(items.find((row) => row.id === id)).toMatchObject(expected);
  expect(items.map((row) => row.id).sort()).toEqual(after.members.map((row) => row.id).sort());
  expect(new Set(items.map((row) => row.id)).size).toBe(items.length);
  expect((await world.db.query('SELECT id FROM auth."user" WHERE id=$1', [id])).rows).toEqual([]);
  expect((await world.db.query('SELECT id FROM auth.account WHERE user_id=$1', [id])).rows).toEqual(
    [],
  );
  expect((await world.db.query('SELECT id FROM auth.session WHERE user_id=$1', [id])).rows).toEqual(
    [],
  );
  const authBefore = world.get<Record<string, unknown[]>>('splitting:memberAuthBefore');
  for (const [table, columns] of [
    ['user', 'id'],
    ['account', 'id,user_id,provider_id,account_id'],
    ['session', 'id,user_id'],
  ] as const) {
    expect(
      (await world.db.query(`SELECT ${columns} FROM auth."${table}" ORDER BY id`)).rows,
      'Creating a companion must not create or change authentication identities or permissions',
    ).toEqual(authBefore[table]);
  }
  for (const path of [`/api/trips/${tripId}`, `/api/trips/${tripId}/members`]) {
    const denied = await callApi(world, 'GET', path, undefined, null);
    expect(denied.status(), 'Adding a companion must not make the trip publicly accessible').toBe(
      401,
    );
    expect(await denied.json()).toMatchObject({ code: 'UNAUTHENTICATED' });
  }
  expect(await snapshotSplittingSources(world), 'Confirmation reads preserve sources').toEqual(
    after,
  );
}
