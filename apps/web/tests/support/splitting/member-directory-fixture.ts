import { expect, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { callApi } from '../../../../api/tests/support/seed.js';
import {
  seedSplittingMembers,
  splittingMemberId,
  splittingTripId,
} from '../../../../api/tests/support/splitting/members-fixture.js';
import { snapshotSplittingSources } from '../../../../api/tests/support/splitting/expense-fixture.js';
import { login } from '../browser.js';
import { browserSplittingStateKey, readBrowserSplittingSnapshot } from './fixture.js';

export const memberDirectoryPhrase = '同行者名單有 owner Alice、啟用 Amy 與停用 Bob';

export const memberDirectoryStateKey = 'splitting:browserMemberDirectory';

export interface BrowserDirectoryMember {
  id: string;
  tripId: string;
  name: string;
  role: 'owner' | 'companion';
  isActive: boolean;
}

/** Arrange a real three-member directory; no financial source or auth companion is created. */
export async function seedBrowserMemberDirectory(page: Page, world: LedgerWorld): Promise<void> {
  await seedSplittingMembers(world);
  const tripId = splittingTripId(world);
  const carolId = splittingMemberId(world, 'Carol');
  const bobId = splittingMemberId(world, 'Bob');
  await world.db.query('DELETE FROM trip_members WHERE id=$1 AND trip_id=$2', [carolId, tripId]);
  world.splitting.ids.members.delete('Carol');
  await world.db.query('UPDATE trip_members SET is_active=false WHERE id=$1 AND trip_id=$2', [
    bobId,
    tripId,
  ]);

  const reply = await callApi(world, 'GET', `/api/trips/${tripId}/members`);
  expect(reply.status(), 'Product must provide the real owner member directory').toBe(200);
  const body = (await reply.json()) as { items: BrowserDirectoryMember[] };
  expect(Array.isArray(body.items), 'Members projection must provide items').toBe(true);
  const expectedMembers: BrowserDirectoryMember[] = ['Alice', 'Amy', 'Bob'].map((name) => ({
    id: splittingMemberId(world, name),
    tripId,
    name,
    role: name === 'Alice' ? 'owner' : 'companion',
    isActive: name !== 'Bob',
  }));
  expect(body.items).toHaveLength(expectedMembers.length);
  expect(new Set(body.items.map((member) => member.id)).size).toBe(3);
  for (const member of expectedMembers)
    expect(body.items.find((row) => row.id === member.id)).toMatchObject({ ...member });

  const initial = await readBrowserSplittingSnapshot(world);
  expect(initial.sources.members.map((member) => member.id).sort()).toEqual(
    expectedMembers.map((member) => member.id).sort(),
  );
  for (const table of ['expenses', 'shares', 'repayments', 'settlements', 'adjustments'] as const)
    expect(initial.sources[table], `Directory fixture starts without ${table}`).toEqual([]);
  expect(world.users.size, 'Companions must not receive authentication identities').toBe(1);
  world.set(memberDirectoryStateKey, {
    tripId,
    members: expectedMembers,
    memberIds: Object.fromEntries(expectedMembers.map((member) => [member.name, member.id])),
    sources: initial.sources,
  });
  world.set(browserSplittingStateKey, initial);
  world.set('splitting:sourceSnapshot', initial.sources);
  world.splitting.snapshot = initial.sources;
  await login(page, world);
  const directoryRead = page.waitForResponse(
    (response) =>
      response.request().method() === 'GET' &&
      new URL(response.url()).pathname === `/api/trips/${tripId}/members`,
  );
  await page.goto(`/trips/${tripId}/members`);
  expect((await directoryRead).status(), 'Members screen must load its real directory').toBe(200);
  await expect(page.getByRole('heading', { name: '同行者', exact: true })).toBeVisible();
  for (const member of expectedMembers)
    await expect(page.getByText(member.name, { exact: true })).toBeVisible();
  expect(
    await snapshotSplittingSources(world),
    'Opening the directory must preserve sources',
  ).toEqual(initial.sources);
}
