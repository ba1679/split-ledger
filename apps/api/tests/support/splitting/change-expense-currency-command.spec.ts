import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from './harness.js';
import { seedSplittingExpenses } from './expense-fixture.js';
import { seedSplittingRepayments } from './repayments-fixture.js';
import { changeOriginalExpenseCurrency } from './change-expense-currency-command.js';
import type { SourceSnapshot } from './types.js';

test('T036 isolated currency correction sends only new currency and amount', async ({ world }) => {
  await seedSplittingExpenses(world, [
    { 項目: '午餐', 幣別: 'TWD', 金額: '300', 付款人: 'Alice', 分攤者: 'Amy' },
  ]);
  await seedSplittingRepayments(world, [
    { 付款人: 'Amy', 收款人: 'Alice', 幣別: 'TWD', 金額: '100', 日期: '2027-01-20' },
  ]);
  await runIsolatedStep(
    {
      phrase: 'owner 將原支出改為 JPY 200',
      input: undefined,
      execute: changeOriginalExpenseCurrency,
    },
    world,
  );
  expect(world.get('splitting:expenseRequest')).toEqual({ currencyCode: 'JPY', amount: '200' });
  const before = world.get<SourceSnapshot>('splitting:before');
  const after = world.get<SourceSnapshot>('splitting:sourceSnapshot');
  expect(after.repayments).toEqual(before.repayments);
  expect(before.repayments[0]).toMatchObject({ currency_code: 'TWD', amount_minor: '10000' });
  expect(after.expenses[0]).toMatchObject({ currency_code: 'JPY', amount_minor: '200' });
});
