import { assertFailedJsonRead } from './failed-json-read.js';
import { expect } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { managementSnapshot } from '../../../../api/tests/support/trip-management/baseline.js';
import {
  ownerRead,
  assertOtherDataUnchanged,
} from '../../../../api/tests/support/trip-management/preservation.js';
import { independentSplittingOracle } from '../../../../api/tests/support/splitting/expense-fixture.js';
import { assertMemberBalanceProjection } from '../../../../api/tests/support/splitting/member-balances-result.js';
import type { PersonalCurrencyTotal, ExpenseList } from '../../../src/api/index.js';
import type { BackgroundRead } from './background-fixture.js';
import { expenseRows, visibleExpenseIds } from './pagination-fixture.js';
import { managementUI, waitForManagementReads } from '../trips/management-fixture.js';

export async function assertLatestBackground(world: LedgerWorld): Promise<void> {
  const state = world.get<BackgroundRead>('loading:background'),
    ui = managementUI(world),
    page = ui.page;
  const retry = world.get<{ kind: string; requestStart: number; requests: number }>(
    'loading:retryRead',
  );
  expect(retry).toEqual({ kind: 'background', requestStart: 1, requests: 2 });
  expect(state.requests.length).toBe(3);
  expect(state.finished).toBe(3);
  expect(state.exchanges.length).toBe(3);
  await assertFailedJsonRead(state.requests[0]!, state.exchanges[0]!.body);
  for (const request of state.requests.slice(1)) expect(request.failure()).toBeNull();
  await expect(expenseRows(page, state.pagination.tripId)).toHaveCount(25);
  const ids = await visibleExpenseIds(page, state.pagination.tripId),
    expenses = state.expectedPages.flatMap((data) => data.items);
  expect(ids).toEqual(state.originalIds);
  expect(ids).toEqual(expenses.map((expense) => expense.id));
  expect(new Set(ids).size).toBe(25);
  expect([...ids].sort()).toEqual(
    state.before.expenses.map((expense) => String(expense.id)).sort(),
  );
  for (const expense of expenses) {
    const row = page.locator(`a[href="/trips/${state.pagination.tripId}/expenses/${expense.id}"]`);
    await expect(row).toContainText(expense.item);
    await expect(row).toContainText(expense.spentOn);
    await expect(row).toContainText(expense.currencyCode);
    await expect(row).toContainText(expense.amount);
    for (const share of expense.shares)
      expect(
        independentSplittingOracle.equal(
          share.amount,
          independentSplittingOracle.share(state.before, expense.id, share.memberId),
        ),
      ).toBe(true);
  }
  for (const [index, expected] of ['30000', '10000'].entries())
    expect(
      String(
        state.before.expenses.find((expense) => expense.id === expenses[index]!.id)!.amount_minor,
      ),
    ).toBe(expected);
  const base = `/api/trips/${state.pagination.tripId}`;
  for (const [index, cursor] of [null, state.pagination.cursor].entries()) {
    const response = await ownerRead(
      world,
      `${base}/expenses?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`,
    );
    expect(response.status()).toBe(200);
    expect((await response.json()) as ExpenseList).toEqual(state.expectedPages[index]);
  }
  const totals = await ownerRead(world, `${base}/totals?scope=personal`);
  expect(totals.status()).toBe(200);
  const amounts = (await totals.json()).totals as PersonalCurrencyTotal[];
  expect(amounts.length).toBe(2);
  for (const [code, numerator, minorUnit] of [
    ['JPY', '1000', 0],
    ['TWD', '50000', 2],
  ] as const)
    expect(
      independentSplittingOracle.equal(
        amounts.find((total) => total.currencyCode === code)!.amount,
        { numerator, denominator: '1', minorUnit },
      ),
    ).toBe(true);
  const balances = await ownerRead(world, `${base}/settlement`);
  expect(balances.status()).toBe(200);
  assertMemberBalanceProjection(
    state.before,
    await balances.json(),
    [
      { 成員: 'Alice', 幣別: 'JPY', 淨額: '1000' },
      { 成員: 'Amy', 幣別: 'JPY', 淨額: '-1000' },
      { 成員: 'Alice', 幣別: 'TWD', 淨額: '500' },
      { 成員: 'Amy', 幣別: 'TWD', 淨額: '-500' },
    ],
    (name) => String(state.before.members.find((member) => member.name === name)!.id),
  );
  await expect(page.getByRole('region', { name: '分幣別總額', exact: true })).toHaveText(
    state.totalsText,
    { useInnerText: true },
  );
  const region = page.getByRole('region', { name: '支出清單', exact: true });
  await expect(region.getByRole('alert')).toHaveCount(0);
  await expect(region.getByRole('status', { name: /更新.*支出|支出.*更新|背景更新/ })).toHaveCount(
    0,
  );
  await expect(region.getByRole('button', { name: /^(重新更新清單|重新嘗試|重試)$/ })).toHaveCount(
    0,
  );
  await waitForManagementReads(ui);
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  await expect(page.getByRole('progressbar')).toHaveCount(0);
  expect(ui.writes.length).toBe(0);
  expect(await managementSnapshot(world)).toEqual(state.before);
  expect(await managementSnapshot(world, state.pagination.untouched.id)).toEqual(
    state.pagination.untouched.before,
  );
  await assertOtherDataUnchanged(world);
  expect(state.errors.map(String)).toEqual([]);
}
