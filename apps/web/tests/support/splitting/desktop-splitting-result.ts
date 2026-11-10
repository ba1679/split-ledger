import { expect } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { expenseLink } from '../expense-helpers.js';
import { desktopSplittingKey, type DesktopSplitting } from './desktop-splitting.js';
import { readBrowserSplittingSnapshot } from './fixture.js';
import { assertThreeWayExpenseProjection } from './saved-three-way-expense-result.js';
import { assertMemberShareDisplay } from './expense-share-display-result.js';
import { assertMemberBalancesScreen } from './member-balances-screen-result.js';

export const desktopSplittingResultPhrase = '電腦顯示同一份同行者、支出與分攤結果';

/** All three fresh desktop queries must describe the same saved phone identities and revision. */
export function assertDesktopSplittingAuthority(state: DesktopSplitting): void {
  const byId = <T extends { id: string }>(rows: readonly T[]) =>
    [...rows].sort((left, right) => left.id.localeCompare(right.id));
  expect(state.tripId).toBe(state.phone.tripId);
  expect(
    byId(state.members.items.map(({ id, name, role, isActive }) => ({ id, name, role, isActive }))),
  ).toEqual(byId(state.phone.members));
  expect(state.members.items.map((member) => member.id).sort()).toEqual(state.phone.memberIds);
  expect(state.expenses).toEqual(state.phone.snapshot.expenses);
  expect(state.expenses.items.map((expense) => expense.id).sort()).toEqual(state.phone.expenseIds);
  expect(state.settlement).toEqual(state.phone.snapshot.settlement);
  expect(state.phone.expenseIds).toHaveLength(1);
  assertThreeWayExpenseProjection(state.phone.snapshot, state.phone.expenseIds[0]!);
  expect(state.writes, 'Cross-device viewing never rebuilds saved records').toEqual([]);
}

/** Use the fresh desktop page, never the original fixture browser or a reconstructed UI. */
export async function assertDesktopSplittingResult(world: LedgerWorld): Promise<void> {
  const state = world.get<DesktopSplitting>(desktopSplittingKey);
  assertDesktopSplittingAuthority(state);
  const { page, phone } = state;
  await expect(page).toHaveURL(new RegExp(`/trips/${phone.tripId}/?$`));
  for (const member of phone.members)
    await expect(page.getByText(member.name, { exact: true }).first()).toBeVisible();
  const card = expenseLink(page, '點心');
  await expect(card).toHaveCount(1);
  await expect(card).toHaveAttribute(
    'href',
    `/trips/${phone.tripId}/expenses/${phone.expenseIds[0]!}`,
  );
  await expect(card).toContainText('JPY 100');
  await expect(card.getByRole('list', { name: '支出分攤' })).toHaveCount(0);
  await assertMemberBalancesScreen(page, world, [
    { 成員: 'Alice', 幣別: 'JPY', 淨額: '200/3', 顯示: 'JPY 66.67' },
    { 成員: 'Amy', 幣別: 'JPY', 淨額: '-100/3', 顯示: 'JPY -33.33' },
    { 成員: 'Bob', 幣別: 'JPY', 淨額: '-100/3', 顯示: 'JPY -33.33' },
  ]);
  await card.click();
  await assertMemberShareDisplay(page.locator('main'), ['Alice', 'Amy', 'Bob'], 'JPY 33.33');
  expect(await readBrowserSplittingSnapshot(world)).toEqual(phone.snapshot);
  expect(state.writes, 'Then performs only projection reads').toEqual([]);
}
