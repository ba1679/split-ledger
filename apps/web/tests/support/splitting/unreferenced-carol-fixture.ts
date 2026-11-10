import { randomUUID } from 'node:crypto';
import { expect, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import type { SourceSnapshot } from '../../../../api/tests/support/splitting/types.js';
import { callApi } from '../../../../api/tests/support/seed.js';
import { splittingTripId } from '../../../../api/tests/support/splitting/members-fixture.js';
import { snapshotSplittingSources } from '../../../../api/tests/support/splitting/expense-fixture.js';
import { browserSplittingStateKey, readBrowserSplittingSnapshot } from './fixture.js';
import {
  memberDirectoryStateKey,
  type BrowserDirectoryMember,
} from './member-directory-fixture.js';

export const unreferencedCarolPhrase = '已新增未被引用的同行者 Carol';

export const unreferencedCarolStateKey = 'splitting:browserUnreferencedCarol';

/** Check every financial reference, including both endpoints of cash and settlement rows. */
export function assertMemberUnreferenced(sources: SourceSnapshot, memberId: string): void {
  const references: [keyof SourceSnapshot, readonly string[]][] = [
    ['expenses', ['payer_member_id']],
    ['shares', ['member_id']],
    ['repayments', ['payer_member_id', 'payee_member_id']],
    ['settlements', ['debtor_member_id', 'creditor_member_id']],
    ['adjustments', ['member_id']],
  ];
  for (const [table, columns] of references)
    expect(
      sources[table].filter((row) => columns.some((column) => row[column] === memberId)),
      `Unreferenced member must have no ${table} references`,
    ).toEqual([]);
}

/** Extend the already-open owner directory using the real product POST, then refresh its query. */
export async function seedUnreferencedCarol(page: Page, world: LedgerWorld): Promise<void> {
  const tripId = splittingTripId(world);
  const before = await readBrowserSplittingSnapshot(world);
  expect(before.sources.members.some((row) => row.name === 'Carol')).toBe(false);
  const id = randomUUID();
  const response = await callApi(world, 'POST', `/api/trips/${tripId}/members`, {
    id,
    name: 'Carol',
  });
  expect(response.status(), 'Product must create Carol through the owner member API').toBe(201);
  const expected: BrowserDirectoryMember = {
    id,
    tripId,
    name: 'Carol',
    role: 'companion',
    isActive: true,
  };
  expect(await response.json()).toMatchObject({ ...expected });
  const detail = await callApi(world, 'GET', `/api/trips/${tripId}/members/${id}`);
  expect(detail.status()).toBe(200);
  expect(await detail.json()).toMatchObject({ ...expected });
  const list = await callApi(world, 'GET', `/api/trips/${tripId}/members`);
  expect(list.status()).toBe(200);
  const { items } = (await list.json()) as { items: BrowserDirectoryMember[] };
  expect(items.map((row) => row.id).sort()).toEqual(
    [...before.sources.members.map((row) => String(row.id)), id].sort(),
  );
  expect(items.find((row) => row.id === id)).toMatchObject({ ...expected });
  const after = await readBrowserSplittingSnapshot(world);
  expect(after.sources.members.find((row) => row.id === id)).toMatchObject({
    id,
    owner_id: world.get<string>('splitting:ownerId'),
    trip_id: tripId,
    name: 'Carol',
    role: 'companion',
    is_active: true,
  });
  expect(after.sources.members.filter((row) => row.id !== id)).toEqual(before.sources.members);
  for (const table of ['expenses', 'shares', 'repayments', 'settlements', 'adjustments'] as const)
    expect(after.sources[table], `Adding Carol must preserve ${table}`).toEqual(
      before.sources[table],
    );
  assertMemberUnreferenced(after.sources, id);
  world.splitting.ids.members.set('Carol', id);
  world.set(unreferencedCarolStateKey, { id, tripId, before, after });
  world.set(memberDirectoryStateKey, {
    tripId,
    members: items,
    memberIds: Object.fromEntries(items.map((row) => [row.name, row.id])),
    sources: after.sources,
  });
  world.set(browserSplittingStateKey, after);
  world.set('splitting:sourceSnapshot', after.sources);
  world.splitting.snapshot = after.sources;
  const query = page.waitForResponse(
    (reply) =>
      reply.request().method() === 'GET' &&
      new URL(reply.url()).pathname === `/api/trips/${tripId}/members`,
  );
  await page.reload();
  expect((await query).status(), 'Refreshing the member directory must query the real API').toBe(
    200,
  );
  await expect(page.getByRole('heading', { name: '同行者', exact: true })).toBeVisible();
  await expect(page.getByText('Carol', { exact: true })).toBeVisible();
  expect(await snapshotSplittingSources(world)).toEqual(after.sources);
}
