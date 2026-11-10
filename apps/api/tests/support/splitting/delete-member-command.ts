import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import { snapshotSplittingSources } from './expense-fixture.js';
import { splittingMemberId, splittingTripId } from './members-fixture.js';
import { captureSplittingRejectionBaseline } from './rejection.js';

export const deleteMemberPhrase = 'owner 刪除同行者 {string}';

/** One real DELETE command; both accepted and rejected outcomes remain available to Then. */
export async function deleteCompanion(world: LedgerWorld, name: string): Promise<void> {
  const tripId = splittingTripId(world);
  const memberId = splittingMemberId(world, name);
  await captureSplittingRejectionBaseline(world);
  world.set('splitting:before', world.splitting.snapshot);
  world.set('splitting:memberId', memberId);
  world.set('splitting:memberName', name);
  world.response = await world.api.delete(`/api/trips/${tripId}/members/${memberId}`, {
    headers: { Cookie: world.users.get('甲')!.cookie, Origin: world.get<string>('webOrigin') },
  });
  const text = await world.response.text();
  world.set('splitting:reply', text ? JSON.parse(text) : null);
  world.set('splitting:replyText', text);
  if (!world.response.ok())
    expect(
      await snapshotSplittingSources(world),
      'Rejected member deletion must preserve every source row and reference',
    ).toEqual(world.splitting.snapshot);
}
