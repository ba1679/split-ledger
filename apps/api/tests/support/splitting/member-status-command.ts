import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import { snapshotSplittingSources } from './expense-fixture.js';
import { splittingMemberId, splittingTripId } from './members-fixture.js';
import { captureSplittingRejectionBaseline } from './rejection.js';

export const memberStatusPhrase = 'owner 將同行者 {string} 設為 {string}';

export function memberStatusInput(status: string): boolean {
  if (status === '停用') return false;
  if (status === '啟用') return true;
  throw Error(`Unsupported companion status: ${status}`);
}

/** Change only isActive through one owner-authenticated PATCH. */
export async function changeCompanionStatus(
  world: LedgerWorld,
  input: { name: string; status: string },
): Promise<void> {
  const isActive = memberStatusInput(input.status);
  const tripId = splittingTripId(world);
  const memberId = splittingMemberId(world, input.name);
  await captureSplittingRejectionBaseline(world);
  world.set('splitting:before', world.splitting.snapshot);
  world.set('splitting:memberId', memberId);
  world.set('splitting:memberName', input.name);
  world.set('splitting:memberStatus', input.status);
  world.response = await world.api.patch(`/api/trips/${tripId}/members/${memberId}`, {
    headers: { Cookie: world.users.get('甲')!.cookie, Origin: world.get<string>('webOrigin') },
    data: { isActive },
  });
  const text = await world.response.text();
  world.set('splitting:reply', text ? JSON.parse(text) : null);
  if (world.response.ok()) {
    const persisted = await world.db.query(
      'SELECT id,is_active FROM trip_members WHERE id=$1 AND trip_id=$2',
      [memberId, tripId],
    );
    expect(persisted.rows, 'Accepted member status change must be persisted').toEqual([
      { id: memberId, is_active: isActive },
    ]);
    world.set('splitting:memberIsActive', isActive);
  } else {
    expect(
      await snapshotSplittingSources(world),
      'Rejected member status change must preserve every source row',
    ).toEqual(world.splitting.snapshot);
  }
}
