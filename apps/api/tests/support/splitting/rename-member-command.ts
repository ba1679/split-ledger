import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import { snapshotSplittingSources } from './expense-fixture.js';
import { splittingMemberId, splittingTripId } from './members-fixture.js';
import { captureSplittingRejectionBaseline } from './rejection.js';

export const renameMemberPhrase = 'owner 將同行者 {string} 改名為 {string}';

/** Preserve the original alias and identity while issuing exactly one name-only PATCH. */
export async function renameCompanion(
  world: LedgerWorld,
  [oldName, newName]: readonly [string, string],
): Promise<void> {
  const tripId = splittingTripId(world);
  const memberId = splittingMemberId(world, oldName);
  await captureSplittingRejectionBaseline(world);
  world.set('splitting:before', world.splitting.snapshot);
  world.set('splitting:memberId', memberId);
  world.set('splitting:memberOriginalName', oldName);
  world.set('splitting:memberRequestedName', newName);
  world.set('splitting:memberRequest', { name: newName });
  world.response = await world.api.patch(`/api/trips/${tripId}/members/${memberId}`, {
    headers: { Cookie: world.users.get('甲')!.cookie, Origin: world.get<string>('webOrigin') },
    data: { name: newName },
  });
  const reply: unknown = await world.response.json();
  world.set('splitting:reply', reply);
  const after = await snapshotSplittingSources(world);
  if (!world.response.ok()) {
    expect(after, 'Rejected member rename must preserve every source and reference').toEqual(
      world.splitting.snapshot,
    );

    return;
  }
  expect(world.response.status(), 'A member rename must return the updated member').toBe(200);
  const member = after.members.find((row) => row.id === memberId);
  expect(
    member,
    'Successful rename must persist before the fixture updates its aliases',
  ).toMatchObject({
    id: memberId,
    trip_id: tripId,
    name: newName.trim(),
  });
  world.splitting.ids.members.set(newName.trim(), memberId);
  world.set('splitting:memberName', newName.trim());
  world.set('splitting:sourceSnapshot', after);
}
