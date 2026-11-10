import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from './harness.js';
import { seedSplittingExpenses } from './expense-fixture.js';
import { seedSplittingRepayments } from './repayments-fixture.js';
import { reduceOriginalExpenseToThreeHundred } from './reduce-expense-amount-command.js';
import type { SourceSnapshot } from './types.js';

test('T037 isolated amount correction preserves an existing larger repayment', async ({
  world,
}) => {
  await seedSplittingExpenses(world, [
    { 項目: '午餐', 幣別: 'JPY', 金額: '1000', 付款人: 'Alice', 分攤者: 'Amy' },
  ]);
  await seedSplittingRepayments(world, [
    { 付款人: 'Amy', 收款人: 'Alice', 幣別: 'JPY', 金額: '400', 日期: '2027-01-20' },
  ]);
  await runIsolatedStep(
    {
      phrase: 'owner 將原支出金額改為 JPY 300',
      input: undefined,
      execute: reduceOriginalExpenseToThreeHundred,
    },
    world,
  );
  expect(world.get('splitting:expenseRequest')).toEqual({ amount: '300' });
  const before = world.get<SourceSnapshot>('splitting:before');
  const after = world.get<SourceSnapshot>('splitting:sourceSnapshot');
  expect(after.repayments).toEqual(before.repayments);
  expect(after.expenses[0]).toMatchObject({ currency_code: 'JPY', amount_minor: '300' });
});
