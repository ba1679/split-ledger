import { expect } from '@playwright/test';
import type { Identity, LedgerWorld } from '../world.js';
import type { SourceSnapshot } from './types.js';
import { snapshotSplittingSources } from './expense-fixture.js';
import { splittingMemberId, splittingMemberNames, splittingTripId } from './members-fixture.js';

export const crossDeviceMembersResultPhrase = '兩個裝置看到同一組穩定成員';

interface StableMember {
  id: string;
  role: string;
  name: string;
  isActive: boolean;
}

export function assertStableMemberSet(reply: unknown, expected: readonly StableMember[]): void {
  expect(reply).toEqual(expect.objectContaining({ items: expect.any(Array) }));
  const { items } = reply as { items: StableMember[] };
  expect(items).toHaveLength(expected.length);
  expect(new Set(items.map((item) => item.id)).size).toBe(expected.length);
  expect(
    items
      .map(({ id, role, name, isActive }) => ({ id, role, name, isActive }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  ).toEqual([...expected].sort((a, b) => a.id.localeCompare(b.id)));
  expect(items.filter((item) => item.role === 'owner')).toHaveLength(1);
}

export async function assertCrossDeviceMembers(world: LedgerWorld): Promise<void> {
  expect(world.response, 'The second device must have issued the members GET').toBeDefined();
  expect(
    world.response!.status(),
    'Product must expose stable members to another owner session',
  ).toBe(200);
  const owner = world.users.get('甲')!;
  const session = world.get<Identity>('splitting:otherDeviceSession');
  expect(session.id).toBe(owner.id);
  expect(session.cookie).not.toBe(owner.cookie);
  expect(world.get('splitting:requestOwnerId')).toBe(owner.id);
  const tripId = splittingTripId(world);
  const rows = await world.db.query(
    'SELECT id,owner_id,trip_id,role,name,is_active FROM trip_members WHERE trip_id=$1',
    [tripId],
  );
  const expected = splittingMemberNames.map((name) => ({
    id: splittingMemberId(world, name),
    role: name === 'Alice' ? 'owner' : 'companion',
    name,
    isActive: true,
  }));
  expect(rows.rows).toHaveLength(4);
  expect(rows.rows.every((row) => row.owner_id === owner.id && row.trip_id === tripId)).toBe(true);
  assertStableMemberSet(
    { items: rows.rows.map((row) => ({ ...row, isActive: row.is_active })) },
    expected,
  );
  assertStableMemberSet(world.get('splitting:reply'), expected);
  const originalDevice = await world.api.get(`/api/trips/${tripId}/members`, {
    headers: { Cookie: owner.cookie },
  });
  expect(originalDevice.status()).toBe(200);
  assertStableMemberSet(await originalDevice.json(), expected);
  expect(await snapshotSplittingSources(world)).toEqual(
    world.get<SourceSnapshot>('splitting:before'),
  );
}
