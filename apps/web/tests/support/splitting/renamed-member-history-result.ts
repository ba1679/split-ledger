import { expect, type Page, type Request } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { callApi } from '../../../../api/tests/support/seed.js';
import { independentSplittingOracle } from '../../../../api/tests/support/splitting/expense-fixture.js';
import { memberRenameKey, type MemberRename } from './rename-member.js';
import { referencedMemberStateKey } from './referenced-member-fixture.js';
import { readBrowserSplittingSnapshot, type BrowserSplittingSnapshot } from './fixture.js';
import { assertMemberShareDisplay } from './expense-share-display-result.js';

export const renamedMemberHistoryPhrase = '午餐與還款顯示 {string} 且仍關聯原成員身分';

/** Identity is supplied by the pre-rename fixture, never reconstructed from the new name. */
export function assertRenamedMemberHistory(
  before: BrowserSplittingSnapshot,
  after: BrowserSplittingSnapshot,
  memberId: string,
  name: string,
): void {
  const omitUpdatedAt = (row: Record<string, unknown>) =>
    Object.fromEntries(Object.entries(row).filter(([key]) => key !== 'updated_at'));
  expect(before.sources.members.some((row) => row.id === memberId)).toBe(true);
  expect(after.sources.members).toHaveLength(before.sources.members.length);
  for (const previous of before.sources.members) {
    const current = after.sources.members.find((row) => row.id === previous.id);
    expect(current, 'A rename must retain every original member UUID').toBeDefined();
    expect(omitUpdatedAt(current!)).toEqual(
      previous.id === memberId
        ? {
            ...omitUpdatedAt(previous),
            name,
            name_key: name.trim().replace(/[A-Z]/g, (character) => character.toLowerCase()),
          }
        : omitUpdatedAt(previous),
    );
  }
  for (const table of ['expenses', 'shares', 'repayments', 'settlements', 'adjustments'] as const)
    expect(after.sources[table], `${table} must retain every original historical fact`).toEqual(
      before.sources[table],
    );
  expect(after.expenses).toEqual(before.expenses);
  expect(after.repayments).toEqual(before.repayments);
  expect(after.totals).toEqual(before.totals);
  expect(after.settlement.balances).toEqual(before.settlement.balances);
  expect(after.settlement.simplifyDebts).toBe(before.settlement.simplifyDebts);
  expect(after.settlement.accountingRevision).toBe(
    (BigInt(before.settlement.accountingRevision) + 1n).toString(),
  );
  const lunch = after.expenses.items.find((row) => row.item === '午餐');
  expect(lunch).toBeDefined();
  const share = lunch!.shares.find((row) => row.memberId === memberId);
  expect(share).toBeDefined();
  expect(
    independentSplittingOracle.equal(share!.amount, {
      numerator: '100',
      denominator: '1',
      minorUnit: 0,
    }),
  ).toBe(true);
  const balance = after.settlement.balances.find(
    (row) => row.memberId === memberId && row.currencyCode === 'JPY',
  );
  expect(balance).toBeDefined();
  expect(
    independentSplittingOracle.equal(balance!.netAmount, {
      numerator: '-80',
      denominator: '1',
      minorUnit: 0,
    }),
  ).toBe(true);
}

/** The DSL explicitly permits refreshed read-only historical displays after renaming. */
export async function assertRenamedMemberHistoryScreen(
  page: Page,
  world: LedgerWorld,
  name: string,
) {
  const rename = world.get<MemberRename>(memberRenameKey);
  const fixture = world.get<{
    memberId: string;
    expenseId: string;
    repaymentId: string;
    after: BrowserSplittingSnapshot;
  }>(referencedMemberStateKey);
  expect(rename).toMatchObject({ memberId: fixture.memberId, newName: name, status: 200 });
  expect(rename.before).toEqual(fixture.after);
  const after = await readBrowserSplittingSnapshot(world);
  assertRenamedMemberHistory(fixture.after, after, fixture.memberId, name);
  const base = `/api/trips/${rename.tripId}`;
  const reply = await callApi(world, 'GET', `${base}/members/${fixture.memberId}`);
  expect(reply.status(), 'The original member resource must survive the rename').toBe(200);
  const member = await reply.json();
  expect(member).toMatchObject({
    id: fixture.memberId,
    tripId: rename.tripId,
    name,
    isActive: true,
  });
  const list = await callApi(world, 'GET', `${base}/members`);
  expect(list.status()).toBe(200);
  const directory = ((await list.json()) as { items: { id: string; name: string }[] }).items;
  expect(directory.map((row) => row.id).sort()).toEqual(
    fixture.after.sources.members.map((row) => String(row.id)).sort(),
  );
  expect(directory.filter((row) => row.id === fixture.memberId)).toEqual([member]);
  const writes: string[] = [];
  const capture = (request: Request) => {
    if (
      new URL(request.url()).pathname.startsWith('/api/') &&
      !['GET', 'HEAD'].includes(request.method())
    )
      writes.push(request.method());
  };
  page.on('request', capture);
  try {
    await page.reload();
    await expect(page.getByRole('heading', { name: '同行者', exact: true })).toBeVisible();
    await expect(page.getByText(name, { exact: true })).toBeVisible();
    await expect(page.getByText(rename.oldName, { exact: true })).toHaveCount(0);
    await page.goto(`/trips/${rename.tripId}/expenses/${fixture.expenseId}`);
    await expect(page.getByLabel('支出項目', { exact: true })).toHaveValue('午餐');
    const expense = after.expenses.items.find((row) => row.id === fixture.expenseId)!;
    const names = expense.shares.map((share) => {
      const originalMember = directory.find((row) => row.id === share.memberId);
      expect(originalMember).toBeDefined();

      return originalMember!.name;
    });
    await assertMemberShareDisplay(page.locator('body'), names, 'JPY 100');
    await expect(page.getByText(rename.oldName, { exact: true })).toHaveCount(0);
    await page.goto(`/trips/${rename.tripId}/settlement`);
    const history = page.getByRole('list', { name: '還款紀錄', exact: true });
    await expect(history).toBeVisible();
    const rows = history.getByRole('listitem');
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText(name);
    await expect(rows.first()).toContainText('Alice');
    await expect(rows.first()).toContainText('JPY 20');
    await expect(history).not.toContainText(rename.oldName);
    expect(writes, 'Refreshing names and history must not submit another command').toEqual([]);
    expect(await readBrowserSplittingSnapshot(world)).toEqual(after);
  } finally {
    page.off('request', capture);
  }
}
