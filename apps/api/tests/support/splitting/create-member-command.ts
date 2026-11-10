import { randomUUID } from 'node:crypto';
import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import { snapshotSplittingSources } from './expense-fixture.js';
import { splittingTripId } from './members-fixture.js';
import { captureSplittingRejectionBaseline } from './rejection.js';

export const createMemberPhrase = 'owner 新增同行者 {string}';

/** Keep raw input and the preallocated identity until persistence is confirmed. */
export async function createCompanion(world: LedgerWorld, name: string): Promise<void> {
  const tripId = splittingTripId(world);
  const id = randomUUID();
  await captureSplittingRejectionBaseline(world);
  world.set('splitting:before', world.splitting.snapshot);
  world.set('splitting:reservedMemberId', id);
  world.set('splitting:memberRequestedName', name);
  world.set('splitting:memberRequest', { id, name });
  const authBefore: Record<string, unknown[]> = {};
  for (const [table, columns] of [
    ['user', 'id'],
    ['account', 'id,user_id,provider_id,account_id'],
    ['session', 'id,user_id'],
  ] as const) {
    authBefore[table] = (
      await world.db.query(`SELECT ${columns} FROM auth."${table}" ORDER BY id`)
    ).rows;
  }
  world.set('splitting:memberAuthBefore', authBefore);
  world.response = await world.api.post(`/api/trips/${tripId}/members`, {
    headers: { Cookie: world.users.get('甲')!.cookie, Origin: world.get<string>('webOrigin') },
    data: { id, name },
  });
  world.set('splitting:reply', await world.response.json());
  const after = await snapshotSplittingSources(world);
  if (!world.response.ok()) {
    expect(after, 'Rejected companion creation must preserve every source').toEqual(
      world.splitting.snapshot,
    );

    return;
  }
  expect(world.response.status(), 'Creating a companion must return 201').toBe(201);
  expect(
    after.members.find((row) => row.id === id),
    'Created companion must persist first',
  ).toMatchObject({
    id,
    trip_id: tripId,
    owner_id: world.get<string>('splitting:ownerId'),
    role: 'companion',
    name: name.trim(),
    is_active: true,
  });
  world.splitting.ids.members.set(name.trim(), id);
  world.set('splitting:memberId', id);
  world.set('splitting:memberName', name.trim());
  world.set('splitting:sourceSnapshot', after);
}
