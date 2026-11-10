import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from './harness.js';
import { seedSplittingExpenses } from './expense-fixture.js';
import { seedSplittingRepayments } from './repayments-fixture.js';
import { seedOriginalSettledExpense } from './settled-expense-fixture.js';
import { deleteOriginalPaidExpense } from './delete-paid-expense-command.js';
import type { SourceSnapshot } from './types.js';

for (const history of ['independent', 'settlement'] as const) {
  test(`T033 isolated source deletion preserves ${history} history`, async ({ world }) => {
    if (history === 'settlement') {
      await seedOriginalSettledExpense(world);
    } else {
      await seedSplittingExpenses(world, [
        { 項目: '午餐', 幣別: 'JPY', 金額: '1000', 付款人: 'Alice', 分攤者: 'Amy' },
      ]);
      await seedSplittingRepayments(world, [
        { 付款人: 'Amy', 收款人: 'Alice', 幣別: 'JPY', 金額: '400', 日期: '2027-01-20' },
      ]);
    }
    await runIsolatedStep(
      {
        phrase: 'owner 刪除已有還款的原支出',
        input: undefined,
        execute: deleteOriginalPaidExpense,
      },
      world,
    );
    const before = world.get<SourceSnapshot>('splitting:before');
    expect(world.get('splitting:originalExpenseId')).toBe(before.expenses[0]!.id);
    expect(world.response!.status()).toBe(204);
    expect(world.get('splitting:reply')).toBe('');
    expect(before.repayments).toHaveLength(1);
    expect(before.settlements).toHaveLength(history === 'settlement' ? 1 : 0);
    expect(before.adjustments).toHaveLength(history === 'settlement' ? 2 : 0);
  });
}
