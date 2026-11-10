import { expect, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { callApi } from '../../../../api/tests/support/seed.js';
import { expenseLink } from '../expense-helpers.js';
import {
  assertSingleExpenseDeletion,
  deletedSharedExpenseKey,
  type ExpenseDeletion,
} from './delete-shared-expense.js';
import { readBrowserSplittingSnapshot } from './fixture.js';

export const deletedDinnerResultPhrase = '晚餐不再出現且沒有晚餐造成的分攤與付款安排';

/** This sentence describes the sole-expense case, rather than an arbitrary history deletion. */
export function assertDeletedDinnerProjection(state: ExpenseDeletion): void {
  assertSingleExpenseDeletion(state);
  expect(state.item).toBe('晚餐');
  expect(state.before.expenses.items.map((row) => row.id)).toEqual([state.expenseId]);
  expect(state.before.sources.expenses).toHaveLength(1);
  expect(state.before.sources.shares.length).toBeGreaterThan(0);
  for (const field of ['expenses', 'shares', 'repayments', 'settlements', 'adjustments'] as const)
    expect(state.after.sources[field], `No remaining ${field} from the sole dinner`).toEqual([]);
  expect(state.after.expenses).toEqual({ items: [], totalCount: 0, nextCursor: null });
  expect(state.after.settlement.arrangements).toEqual([]);
  for (const balance of state.after.settlement.balances) {
    expect(BigInt(balance.netAmount.numerator)).toBe(0n);
    expect(balance.netAmount.denominator).toBe('1');
  }
  expect(state.browserSettlement).toEqual(state.after.settlement);
}

/** Read only: the preceding When already checked the ledger and opened its refreshed settlement. */
export async function assertDeletedDinner(page: Page, world: LedgerWorld): Promise<void> {
  const state = world.get<ExpenseDeletion>(deletedSharedExpenseKey);
  assertDeletedDinnerProjection(state);
  await expect(page).toHaveURL(new RegExp(`/trips/${state.tripId}/settlement/?$`));
  await expect(expenseLink(page, '晚餐')).toHaveCount(0);
  await expect(page.getByText('晚餐', { exact: true })).toHaveCount(0);
  await expect(page.locator('a[href*="/settlements/new"]')).toHaveCount(0);
  const missing = await callApi(
    world,
    'GET',
    `/api/trips/${state.tripId}/expenses/${state.expenseId}`,
  );
  expect(missing.status(), 'Deleted dinner must no longer be readable by its original UUID').toBe(
    404,
  );
  const reread = await readBrowserSplittingSnapshot(world);
  expect(reread).toEqual(state.after);
  assertDeletedDinnerProjection({ ...state, after: reread });
}
