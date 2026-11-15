import { expect } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { ownerRead } from '../../../../api/tests/support/trip-management/preservation.js';
import type { ExpenseList } from '../../../src/api/index.js';
import { managementUI, waitForManagementReads } from '../trips/management-fixture.js';
import {
  expenseRows,
  visibleExpenseIds,
  assertPaginationDataUnchanged,
  type PaginationRead,
} from './pagination-fixture.js';

export async function assertPaginationComplete(world: LedgerWorld): Promise<void> {
  const state = world.get<PaginationRead>('loading:pagination'),
    ui = managementUI(world),
    page = ui.page;
  expect(world.get<boolean>('loading:repeatComplete')).toBe(true);
  expect(state.released).toBe(true);
  expect(state.arrived).toBe(1);
  expect(state.finished).toBe(1);
  expect(state.requests.length).toBe(1);
  await expect(expenseRows(page, state.tripId)).toHaveCount(25);
  const ids = await visibleExpenseIds(page, state.tripId),
    complete = [...state.first.items, ...state.second.items];
  expect(ids).toEqual(complete.map((expense) => expense.id));
  expect(new Set(ids).size).toBe(25);
  expect(ids.slice(0, 20)).toEqual(state.first.items.map((expense) => expense.id));
  expect((await expenseRows(page, state.tripId).allTextContents()).slice(0, 20)).toEqual(
    state.originalRows,
  );
  expect([...ids].sort()).toEqual(
    state.before.expenses.map((expense) => String(expense.id)).sort(),
  );
  const authoritativeIds: string[] = [];
  let cursor: string | null = null;
  for (let index = 0; index < 2; index++) {
    const response = await ownerRead(
      world,
      `/api/trips/${state.tripId}/expenses${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`,
    );
    expect(response.status()).toBe(200);
    const data = (await response.json()) as ExpenseList;
    expect(data).toEqual(index === 0 ? state.first : state.second);
    authoritativeIds.push(...data.items.map((expense) => expense.id));
    cursor = data.nextCursor;
  }
  expect(cursor).toBeNull();
  expect(ids).toEqual(authoritativeIds);
  for (const expense of complete) {
    const row = page.locator(`a[href="/trips/${state.tripId}/expenses/${expense.id}"]`);
    await expect(row).toContainText(expense.item);
    await expect(row).toContainText(expense.spentOn);
    await expect(row).toContainText(expense.currencyCode);
    await expect(row).toContainText(expense.amount);
  }
  await expect(page.getByText(/^25\s*筆(?:紀錄|支出)?$/)).toBeVisible();
  await expect(page.getByRole('region', { name: '分幣別總額', exact: true })).toHaveText(
    state.totalsText,
  );
  await expect(page.getByRole('button', { name: '載入更多', exact: true })).toHaveCount(0);
  await waitForManagementReads(ui);
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  await expect(page.getByRole('progressbar')).toHaveCount(0);
  expect(ui.writes.length).toBe(0);
  expect(state.errors.map(String)).toEqual([]);
  await assertPaginationDataUnchanged(world);
  // Release/remove this completed cursor observer before a later background fixture is installed.
  await state.dispose();
}
