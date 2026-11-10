import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from './harness.js';
import { seedSplittingExpenses } from './expense-fixture.js';
import { seedSplittingRepayments } from './repayments-fixture.js';
import { seedOriginalSettledExpense } from './settled-expense-fixture.js';
import { changeOriginalExpenseToEightHundred } from './change-expense-to-eight-hundred-command.js';
import type { SourceSnapshot } from './types.js';

for (const history of ['independent repayment', 'historical settlement'] as const) {
  test(`T038 isolated amount-only correction preserves ${history}`, async ({ world }) => {
    if (history === 'historical settlement') await seedOriginalSettledExpense(world);
    else {
      await seedSplittingExpenses(world, [
        { 項目: '晚餐', 幣別: 'JPY', 金額: '1000', 付款人: 'Alice', 分攤者: 'Amy' },
      ]);
      await seedSplittingRepayments(world, [
        { 付款人: 'Amy', 收款人: 'Alice', 幣別: 'JPY', 金額: '400', 日期: '2027-01-20' },
      ]);
    }
    await runIsolatedStep(
      {
        phrase: 'owner 將原支出金額改為 JPY 800',
        input: undefined,
        execute: changeOriginalExpenseToEightHundred,
      },
      world,
    );
    expect(world.get('splitting:expenseRequest')).toEqual({ amount: '800' });
    const before = world.get<SourceSnapshot>('splitting:before');
    const after = world.get<SourceSnapshot>('splitting:sourceSnapshot');
    expect(after.expenses[0]).toMatchObject({ id: before.expenses[0]!.id, amount_minor: '800' });
    for (const key of ['repayments', 'settlements', 'adjustments'] as const)
      expect(after[key], `The correction must preserve ${key}`).toEqual(before[key]);
  });
}
