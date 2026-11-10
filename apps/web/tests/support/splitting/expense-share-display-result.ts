import { expect, type Locator, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { callApi } from '../../../../api/tests/support/seed.js';
import { expenseAuthorityWorld } from '../../../../api/tests/support/splitting/legacy-fixture.js';
import { fixtureMinorAmount } from '../../../../api/tests/support/splitting/expense-fixture.js';
import { splittingTripId } from '../../../../api/tests/support/splitting/members-fixture.js';
import { readBrowserSplittingSnapshot, type BrowserExpense } from './fixture.js';
import { expenseShareViewKey, type ExpenseShareView } from './view-expense-shares.js';

export const expenseShareDisplayPhrase = '點心各成員分攤金額皆顯示 {string} 且不附算式';

/** Independent exact arithmetic; never derives an expected share from the visible rounded amount. */
export function assertEqualExpenseShares(expense: BrowserExpense, selectedIds: readonly string[]) {
  expect(expense.item).toBe('點心');
  expect(selectedIds.length).toBeGreaterThan(0);
  expect(new Set(selectedIds).size).toBe(selectedIds.length);
  expect(expense.shares.map((share) => share.memberId).sort()).toEqual([...selectedIds].sort());
  const total = fixtureMinorAmount(expense.amount, expense.minorUnit);
  const count = BigInt(selectedIds.length);
  let sumNumerator = 0n;
  let sumDenominator = 1n;
  for (const share of expense.shares) {
    expect(Object.keys(share.amount).sort()).toEqual(['denominator', 'minorUnit', 'numerator']);
    expect(share.amount.numerator).toMatch(/^[1-9][0-9]*$/);
    expect(share.amount.denominator).toMatch(/^[1-9][0-9]*$/);
    expect(share.amount.minorUnit).toBe(expense.minorUnit);
    const numerator = BigInt(share.amount.numerator);
    const denominator = BigInt(share.amount.denominator);
    expect(numerator * count, 'Every selected member retains the same exact amount/n').toBe(
      total * denominator,
    );
    let a = numerator,
      b = denominator;
    while (b !== 0n) [a, b] = [b, a % b];
    expect(a, 'Exact shares must be reduced').toBe(1n);
    sumNumerator = sumNumerator * denominator + numerator * sumDenominator;
    sumDenominator *= denominator;
  }
  expect(sumNumerator, 'Exact shares sum to the source without a distributed remainder').toBe(
    total * sumDenominator,
  );
}

export async function assertExpenseShareDisplay(page: Page, world: LedgerWorld, display: string) {
  expect(display).toMatch(/^[A-Z]{3} (?:0|[1-9][0-9]*)(?:\.[0-9]{1,2})?$/);
  const state = world.get<ExpenseShareView>(expenseShareViewKey);
  const authority = expenseAuthorityWorld(world);
  const tripId = splittingTripId(authority);
  const before = await readBrowserSplittingSnapshot(authority);
  expect(before).toEqual(state.after);
  const response = await callApi(
    authority,
    'GET',
    `/api/trips/${tripId}/expenses/${state.expenseId}`,
  );
  expect(response.status(), 'Saved exact shares must remain readable').toBe(200);
  const expense = (await response.json()) as BrowserExpense;
  expect(expense).toEqual(state.expense);
  const selectedIds = state.before.sources.shares
    .filter((share) => share.expense_id === state.expenseId)
    .map((share) => String(share.member_id));
  assertEqualExpenseShares(expense, selectedIds);
  await assertMemberShareDisplay(
    page.locator('body'),
    selectedIds.map((id) => {
      const member = state.members.find((candidate) => candidate.id === id);
      expect(member, 'Every share has a same-trip member name').toBeDefined();

      return member!.name;
    }),
    display,
  );
  expect(await readBrowserSplittingSnapshot(authority), 'Display assertions are read-only').toEqual(
    before,
  );
}

/** Reusable on the current detail page or saved ledger card; never navigates. */
export async function assertMemberShareDisplay(
  scope: Locator,
  memberNames: readonly string[],
  display: string,
) {
  const shares = scope.getByRole('list', { name: '支出分攤', exact: true });
  await expect(shares, 'Saved expense must expose readable member share amounts').toBeVisible();
  const rows = shares.getByRole('listitem');
  await expect(rows).toHaveCount(memberNames.length);
  for (const name of memberNames) {
    const row = rows.filter({
      hasText: new RegExp(`(?:^|\\s)${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\s|$)`),
    });
    await expect(row).toHaveCount(1);
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedDisplay = display.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    await expect(row).toHaveText(
      new RegExp(`^\\s*${escapedName}\\s*[:：]?\\s*${escapedDisplay}\\s*$`),
    );
    const amount = row.getByText(display, { exact: true });
    await expect(amount).toBeVisible();
    await expect(amount).toHaveAccessibleName(display);
    await expect(row).not.toContainText(/…|\.\.\.|\d\s*[/÷]\s*\d|[（(]|尚未取整|精確|公平/);
  }
  await expect(scope).not.toContainText(/精確|公平|尚未取整/);
}
