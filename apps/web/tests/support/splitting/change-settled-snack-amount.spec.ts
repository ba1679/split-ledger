import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { seedBrowserSplittingExpenses, type BrowserSplittingSnapshot } from './fixture.js';
import {
  browserSettledHistoryKey,
  settleBrowserAmyArrangement,
} from './settled-arrangement-fixture.js';
import {
  changeExpenseAmount,
  expenseAmountChangeKey,
  type ExpenseAmountChange,
} from './change-expense-amount.js';

test('T151: one UI amount correction retains the original settled snack and immutable payment history', async ({
  page,
  world,
}) => {
  await seedBrowserSplittingExpenses(page, world, [
    { 項目: '點心', 幣別: 'JPY', 金額: '100', 付款人: 'Alice', 分攤者: 'Alice、Amy、Bob' },
  ]);
  await settleBrowserAmyArrangement(world);
  const history = world.get<BrowserSplittingSnapshot>(browserSettledHistoryKey);
  await runIsolatedStep(
    {
      phrase: 'owner 將點心金額改為 JPY 200',
      input: undefined,
      execute: async (context) => changeExpenseAmount(page, context, '點心', '200'),
    },
    world,
  );
  const state = world.get<ExpenseAmountChange>(expenseAmountChangeKey);
  expect(state.status).toBe(200);
  expect(state.before).toEqual(history);
  expect(state.after.expenses.items).toHaveLength(1);
  expect(state.after.expenses.items[0]!.id).toBe(history.expenses.items[0]!.id);
  expect(state.after.expenses.items[0]!.amount).toBe('200');
  expect(history.sources.settlements).toHaveLength(1);
  expect(history.sources.repayments).toHaveLength(1);
  expect(history.sources.adjustments).toHaveLength(2);
  for (const key of ['settlements', 'repayments', 'adjustments'] as const)
    expect(state.after.sources[key]).toEqual(history.sources[key]);
  expect(state.after.repayments).toEqual(history.repayments);
});
