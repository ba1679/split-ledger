import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from './harness.js';
import { seedSplittingExpenses } from './expense-fixture.js';
import { seedExpenseValidationMembers } from './expense-validation-fixture.js';
import { renameExpenseWithInactiveShares } from './inactive-expense-command.js';
import type { SourceSnapshot } from './types.js';

test('T031 isolated metadata correction sends only item for the existing inactive-share expense', async ({
  world,
}) => {
  await seedSplittingExpenses(world, [
    { 項目: '晚餐', 幣別: 'JPY', 金額: '100', 付款人: 'Alice', 分攤者: 'Carol' },
  ]);
  await seedExpenseValidationMembers(world);
  await runIsolatedStep(
    {
      phrase: 'owner 僅修改既有含停用分攤者支出的項目',
      input: undefined,
      execute: renameExpenseWithInactiveShares,
    },
    world,
  );
  expect(world.get('splitting:expenseRequest')).toEqual({ item: '車票修正' });
  expect(world.get('splitting:expenseId')).toBe(world.splitting.ids.expenses.get('晚餐'));
  const before = world.get<SourceSnapshot>('splitting:before');
  expect(before.members.find((row) => row.name === 'Carol')!.is_active).toBe(false);
  expect(world.response!.status()).toBe(200);
  expect(world.get('splitting:reply')).toMatchObject({
    id: world.get('splitting:expenseId'),
    item: '車票修正',
  });
});
