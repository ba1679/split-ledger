import { expect, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { callApi } from '../../../../api/tests/support/seed.js';
import {
  seedSplittingMembers,
  splittingMemberId,
  splittingTripId,
} from '../../../../api/tests/support/splitting/members-fixture.js';
import { seedOtherTripMember } from '../../../../api/tests/support/splitting/other-trip-member-fixture.js';
import { snapshotSplittingSources } from '../../../../api/tests/support/splitting/expense-fixture.js';
import { login } from '../browser.js';
import { browserSplittingStateKey, readBrowserSplittingSnapshot } from './fixture.js';

export const otherTripAmyPhrase = '另一旅行有 Amy 而目前旅行只有 owner Alice';

export const otherTripAmyStateKey = 'splitting:browserOtherTripAmy';

interface Member {
  id: string;
  tripId: string;
  role: 'owner' | 'companion';
  name: string;
  isActive: boolean;
}

/** Real same-owner trips, with no current-trip Amy alias before the tested create. */
export async function seedBrowserOtherTripAmy(page: Page, world: LedgerWorld): Promise<void> {
  await seedSplittingMembers(world);
  const currentTripId = splittingTripId(world);
  const ownerMemberId = splittingMemberId(world, 'Alice');
  await world.db.query('DELETE FROM trip_members WHERE trip_id=$1 AND role=$2', [
    currentTripId,
    'companion',
  ]);
  for (const [name, id] of world.splitting.ids.members)
    if (id !== ownerMemberId) world.splitting.ids.members.delete(name);
  await seedOtherTripMember(world, 'Amy');
  const otherTripId = world.get<string>('splitting:otherTripId');
  const otherMemberId = world.get<string>('splitting:otherMemberId');

  async function members(tripId: string): Promise<Member[]> {
    const response = await callApi(world, 'GET', `/api/trips/${tripId}/members`);
    expect(response.status(), 'Product must provide the owner member directory').toBe(200);
    const body = (await response.json()) as { items: Member[] };
    expect(Array.isArray(body.items)).toBe(true);

    return body.items;
  }

  const currentMembers = await members(currentTripId);
  const otherMembers = await members(otherTripId);
  expect(currentMembers).toHaveLength(1);
  expect(currentMembers[0]).toMatchObject({
    id: ownerMemberId,
    tripId: currentTripId,
    role: 'owner',
    name: 'Alice',
    isActive: true,
  });
  expect(otherMembers).toHaveLength(2);
  expect(otherMembers.find((row) => row.id === otherMemberId)).toMatchObject({
    tripId: otherTripId,
    role: 'companion',
    name: 'Amy',
    isActive: true,
  });
  expect(otherMembers.filter((row) => row.role === 'owner')).toHaveLength(1);
  expect(otherMembers.every((row) => row.tripId === otherTripId)).toBe(true);
  expect(otherMembers.some((row) => row.id === ownerMemberId)).toBe(false);
  expect(world.splitting.ids.members.has('Amy')).toBe(false);
  expect(splittingTripId(world)).toBe(currentTripId);
  expect(world.users.size).toBe(1);

  const initial = await readBrowserSplittingSnapshot(world);
  const otherSources = await snapshotSplittingSources(world, otherTripId);
  expect(otherSources.trips[0]!.owner_id).toBe(initial.sources.trips[0]!.owner_id);
  expect(initial.expenses.items).toEqual([]);
  expect(initial.repayments.items).toEqual([]);
  world.set(browserSplittingStateKey, initial);
  world.set(otherTripAmyStateKey, {
    currentTripId,
    otherTripId,
    ownerMemberId,
    otherMemberId,
    currentMembers,
    otherMembers,
    currentSources: initial.sources,
    otherSources,
  });
  world.set('splitting:sourceSnapshot', initial.sources);
  world.splitting.snapshot = initial.sources;
  await login(page, world);
  const directoryRead = page.waitForResponse(
    (response) =>
      response.request().method() === 'GET' &&
      new URL(response.url()).pathname === `/api/trips/${currentTripId}/members`,
  );
  await page.goto(`/trips/${currentTripId}/members`);
  expect((await directoryRead).status(), 'Members page must query its own trip').toBe(200);
  await expect(page.getByRole('heading', { name: '同行者', exact: true })).toBeVisible();
  await expect(page.getByText('Alice', { exact: true })).toBeVisible();
  await expect(page.getByText('Amy', { exact: true })).toHaveCount(0);
  expect(await snapshotSplittingSources(world)).toEqual(initial.sources);
  expect(await snapshotSplittingSources(world, otherTripId)).toEqual(otherSources);
}
