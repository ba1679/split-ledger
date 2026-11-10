import { test, expect } from '../fixtures.js';
import { seedBrowserSplittingExpenses } from './fixture.js';
import {
  disposeBrowserMigratedLegacyExpense,
  seedBrowserMigratedLegacyExpense,
} from './legacy-browser-fixture.js';
import {
  expenseShareViewKey,
  viewExpenseShares,
  type ExpenseShareView,
} from './view-expense-shares.js';

test('T152: opens the specified shared expense and retains exact thirds from the real response', async ({
  page,
  world,
}) => {
  await seedBrowserSplittingExpenses(page, world, [
    { 項目: '點心', 幣別: 'JPY', 金額: '100', 付款人: 'Alice', 分攤者: 'Alice、Amy、Bob' },
  ]);
  await viewExpenseShares(page, world, '點心');
  const state = world.get<ExpenseShareView>(expenseShareViewKey);
  expect(state.expense.shares).toHaveLength(3);
  for (const share of state.expense.shares)
    expect(share.amount).toEqual({ numerator: '100', denominator: '3', minorUnit: 0 });
});

test('T152: migrated flight reads the legacy authority rather than the main test database', async ({
  page,
  world,
}) => {
  try {
    await seedBrowserMigratedLegacyExpense(page, world);
    await viewExpenseShares(page, world, '機票');
    const state = world.get<ExpenseShareView>(expenseShareViewKey);
    expect(state.expense).toMatchObject({
      item: '機票',
      amount: '8000.00',
      currencyCode: 'TWD',
      spentOn: '2027-01-15',
    });
    expect(state.expense.shares).toHaveLength(1);
    expect(state.members).toHaveLength(1);
    expect(state.members[0]).toMatchObject({ name: 'Alice', role: 'owner' });
  } finally {
    await disposeBrowserMigratedLegacyExpense(page, world);
  }
});
