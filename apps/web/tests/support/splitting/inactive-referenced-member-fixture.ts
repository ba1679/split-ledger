import { expect, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { callApi } from '../../../../api/tests/support/seed.js';
import {
  splittingMemberId,
  splittingTripId,
} from '../../../../api/tests/support/splitting/members-fixture.js';
import {
  independentSplittingOracle,
  snapshotSplittingSources,
} from '../../../../api/tests/support/splitting/expense-fixture.js';
import {
  browserSplittingStateKey,
  readBrowserSplittingSnapshot,
  seedBrowserSplittingExpenses,
} from './fixture.js';
import {
  memberDirectoryStateKey,
  type BrowserDirectoryMember,
} from './member-directory-fixture.js';

export const inactiveReferencedMemberPhrase = '已被支出引用的 {string} 已停用';

export const inactiveReferencedMemberStateKey = 'splitting:browserInactiveReferencedMember';

/** Real historical expense first; only the member status is changed through the product API. */
export async function seedInactiveReferencedMember(
  page: Page,
  world: LedgerWorld,
  name: string,
): Promise<void> {
  expect(name.trim()).toBe(name);
  expect(name).not.toBe('');
  expect(['Alice', 'owner', 'Bob']).not.toContain(name);
  await seedBrowserSplittingExpenses(page, world, [
    { 項目: '午餐', 幣別: 'JPY', 金額: '300', 付款人: 'Alice', 分攤者: `Alice、${name}、Bob` },
  ]);
  const memberId = splittingMemberId(world, name);
  const tripId = splittingTripId(world);
  const base = `/api/trips/${tripId}`;
  const before = await readBrowserSplittingSnapshot(world);
  const expense = before.expenses.items[0]!;
  expect(before.expenses.items).toHaveLength(1);
  expect(expense).toMatchObject({ item: '午餐', amount: '300', currencyCode: 'JPY' });
  expect(expense.shares).toHaveLength(3);
  expect(expense.shares.find((row) => row.memberId === memberId)?.amount).toEqual({
    numerator: '100',
    denominator: '1',
    minorUnit: 0,
  });
  const response = await callApi(world, 'PATCH', `${base}/members/${memberId}`, {
    isActive: false,
  });
  expect(response.status(), 'Product must deactivate the referenced companion').toBe(200);
  const expected: BrowserDirectoryMember = {
    id: memberId,
    tripId,
    name,
    role: 'companion',
    isActive: false,
  };
  expect(await response.json()).toMatchObject({ ...expected });
  const directory = await callApi(world, 'GET', `${base}/members`);
  expect(directory.status(), 'Product must expose the inactive member with its original ID').toBe(
    200,
  );
  const { items } = (await directory.json()) as { items: BrowserDirectoryMember[] };
  expect(items.map((row) => row.id).sort()).toEqual(
    before.sources.members.map((row) => row.id).sort(),
  );
  expect(items.find((row) => row.id === memberId)).toMatchObject({ ...expected });
  const detail = await callApi(world, 'GET', `${base}/members/${memberId}`);
  expect(detail.status()).toBe(200);
  expect(await detail.json()).toMatchObject({ ...expected });
  const after = await readBrowserSplittingSnapshot(world);
  for (const table of ['expenses', 'shares', 'repayments', 'settlements', 'adjustments'] as const)
    expect(after.sources[table], `Deactivation must retain historical ${table}`).toEqual(
      before.sources[table],
    );
  expect(after.sources.members.filter((row) => row.id !== memberId)).toEqual(
    before.sources.members.filter((row) => row.id !== memberId),
  );
  const original = before.sources.members.find((row) => row.id === memberId)!;
  const changed = after.sources.members.find((row) => row.id === memberId)!;
  expect(changed).toEqual({ ...original, is_active: false, updated_at: changed.updated_at });
  expect(after.expenses).toEqual(before.expenses);
  expect(after.repayments).toEqual(before.repayments);
  expect(after.totals).toEqual(before.totals);
  expect(after.settlement.accountingRevision).toBe(
    (BigInt(before.settlement.accountingRevision) + 1n).toString(),
  );
  for (const member of after.sources.members)
    expect(
      independentSplittingOracle.equal(
        independentSplittingOracle.balance(after.sources, String(member.id), 'JPY'),
        independentSplittingOracle.balance(before.sources, String(member.id), 'JPY'),
      ),
    ).toBe(true);

  world.set(inactiveReferencedMemberStateKey, {
    memberId,
    name,
    expenseId: expense.id,
    before,
    after,
  });
  world.set(memberDirectoryStateKey, {
    tripId,
    members: items,
    memberIds: Object.fromEntries(items.map((row) => [row.name, row.id])),
    sources: after.sources,
  });
  world.set(browserSplittingStateKey, after);
  world.set('splitting:memberId', memberId);
  world.set('splitting:sourceSnapshot', after.sources);
  world.set('splitting:revision', after.settlement.accountingRevision);
  world.splitting.snapshot = after.sources;
  const directoryRead = page.waitForResponse(
    (reply) =>
      reply.request().method() === 'GET' && new URL(reply.url()).pathname === `${base}/members`,
  );
  await page.goto(`/trips/${tripId}/members`);
  expect((await directoryRead).status(), 'Members screen must load the real directory').toBe(200);
  await expect(page.getByRole('heading', { name: '同行者', exact: true })).toBeVisible();
  await expect(page.getByText(name, { exact: true })).toBeVisible();
  expect(
    await snapshotSplittingSources(world),
    'Opening members must preserve the inactive historical identity',
  ).toEqual(after.sources);
}
