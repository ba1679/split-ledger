import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import { callApi } from '../seed.js';
import { requireProductColumns } from './schema.js';

export const newTripOwnerResultPhrase = '新旅行同時具有唯一固定 owner 成員';

export function assertNewTripOwnerProjection(
  trip: Record<string, unknown>,
  members: readonly Record<string, unknown>[],
  expected: { tripId: string; accountName: string },
): void {
  expect(trip.id).toBe(expected.tripId);
  expect(trip.ownerMemberId, 'POST must already return the fixed owner member').toEqual(
    expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),
  );
  expect(trip.simplifyDebts).toBe(false);
  expect(trip.accountingRevision).toEqual(expect.stringMatching(/^(?:0|[1-9][0-9]*)$/));
  expect(members, 'A newly created trip has exactly one initial member').toHaveLength(1);
  expect(members[0]).toMatchObject({
    id: trip.ownerMemberId,
    tripId: expected.tripId,
    role: 'owner',
    isActive: true,
    name: expected.accountName,
  });
}

export async function assertNewTripOwner(world: LedgerWorld): Promise<void> {
  expect(world.response?.status(), 'Trip creation must succeed atomically').toBe(201);
  const created = (await world.response!.json()) as Record<string, unknown>;
  const tripId = world.get<string>('backend:tripId');
  const account = world.users.get('甲')!;
  // Assert the POST projection before any confirmation read; Then never creates a member.
  expect(created.ownerMemberId, 'The creating POST must include ownerMemberId').toBeDefined();
  await requireProductColumns(world, 'trips', ['simplify_debts', 'accounting_revision']);
  await requireProductColumns(world, 'trip_members', [
    'id',
    'owner_id',
    'trip_id',
    'role',
    'name',
    'is_active',
  ]);
  const readRows = async () => ({
    trips: (await world.db.query('SELECT * FROM trips WHERE id=$1', [tripId])).rows,
    members: (
      await world.db.query('SELECT * FROM trip_members WHERE trip_id=$1 ORDER BY id', [tripId])
    ).rows,
  });
  const before = await readRows();
  expect(before.trips).toHaveLength(1);
  expect(before.trips[0]).toMatchObject({
    owner_id: account.id,
    simplify_debts: false,
    accounting_revision: created.accountingRevision,
  });
  expect(before.members).toHaveLength(1);
  expect(before.members[0]).toMatchObject({
    id: created.ownerMemberId,
    owner_id: account.id,
    trip_id: tripId,
    name: account.name,
    role: 'owner',
    is_active: true,
  });
  const expected = { tripId, accountName: account.name };
  const dbProjection = before.members.map((row) => ({
    id: row.id,
    tripId: row.trip_id,
    role: row.role,
    name: row.name,
    isActive: row.is_active,
  }));
  assertNewTripOwnerProjection(created, dbProjection, expected);
  const tripResponse = await callApi(world, 'GET', `/api/trips/${tripId}`);
  expect(tripResponse.status()).toBe(200);
  expect(await tripResponse.json()).toEqual(created);
  const membersResponse = await callApi(world, 'GET', `/api/trips/${tripId}/members`);
  expect(membersResponse.status()).toBe(200);
  const memberItems = ((await membersResponse.json()) as { items: Record<string, unknown>[] })
    .items;
  assertNewTripOwnerProjection(created, memberItems, expected);
  expect(
    memberItems.map(({ id, tripId, role, name, isActive }) => ({
      id,
      tripId,
      role,
      name,
      isActive,
    })),
  ).toEqual(dbProjection);
  expect(await readRows(), 'Confirmation reads cannot complete a missing owner creation').toEqual(
    before,
  );
}
