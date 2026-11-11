import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import { callApi } from '../seed.js';
import { snapshotSplittingSources } from './expense-fixture.js';
import { splittingMemberId, splittingTripId } from './members-fixture.js';
import type { SourceSnapshot } from './types.js';

export const deletedMemberResultPhrase = '同行者 {string} 已從旅行移除';

export function assertOnlyCompanionRemoved(
  before: SourceSnapshot,
  after: SourceSnapshot,
  memberId: string,
): void {
  expect(before.members.find((member) => member.id === memberId)?.role).toBe('companion');
  expect(after.members).toEqual(before.members.filter((member) => member.id !== memberId));
  for (const key of ['expenses', 'shares', 'repayments', 'settlements', 'adjustments'] as const)
    expect(after[key], `Member deletion must preserve ${key}`).toEqual(before[key]);
  expect(after.trips).toHaveLength(before.trips.length);
  for (const trip of before.trips) {
    const updated = after.trips.find((row) => row.id === trip.id);
    expect(updated).toBeDefined();
    expect(BigInt(String(updated!.accounting_revision))).toBe(
      BigInt(String(trip.accounting_revision)) + 1n,
    );
    const { accounting_revision: _oldRevision, updated_at: _oldUpdated, ...oldFields } = trip;
    const { accounting_revision: _newRevision, updated_at: _newUpdated, ...newFields } = updated!;
    expect(newFields).toEqual(oldFields);
  }
}

export async function assertDeletedCompanion(world: LedgerWorld, name: string): Promise<void> {
  const memberId = splittingMemberId(world, name);
  const tripId = splittingTripId(world);
  expect(world.get('splitting:memberId')).toBe(memberId);
  expect(world.response!.status(), 'Unused companion deletion must succeed').toBe(204);
  expect(await world.response!.text(), 'Successful deletion must have no response body').toBe('');
  const before = world.get<SourceSnapshot>('splitting:before');
  const after = await snapshotSplittingSources(world);
  assertOnlyCompanionRemoved(before, after, memberId);
  for (let read = 0; read < 2; read++) {
    const single = await callApi(world, 'GET', `/api/trips/${tripId}/members/${memberId}`);
    expect(single.status()).toBe(404);
    const list = await callApi(world, 'GET', `/api/trips/${tripId}/members`);
    expect(list.status(), 'Product must provide authoritative remaining member list').toBe(200);
    const body = (await list.json()) as { items: { id: string; tripId: string }[] };
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.items.map((member) => member.id).sort()).toEqual(
      after.members.map((member) => String(member.id)).sort(),
    );
    for (const member of body.items) expect(member.tripId).toBe(tripId);
    const trip = await callApi(world, 'GET', `/api/trips/${tripId}`);
    expect(trip.status()).toBe(200);
    expect((await trip.json()).accountingRevision).toBe(
      String(after.trips[0]!.accounting_revision),
    );
  }
  expect(
    await snapshotSplittingSources(world),
    'Verification reads must not mutate sources',
  ).toEqual(after);
}
