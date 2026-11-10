import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from './harness.js';
import { recordLegacyPersonalExpense } from './legacy-expense-command.js';
import { seedSplittingMembers } from './members-fixture.js';

test('T030 isolated legacy request omits both splitting fields and retains its allocated UUID', async ({
  world,
}) => {
  await seedSplittingMembers(world);
  await runIsolatedStep(
    {
      phrase: 'owner 以舊版個人支出欄位記錄機票',
      input: undefined,
      execute: recordLegacyPersonalExpense,
    },
    world,
  );
  expect(world.get('splitting:expenseRequest')).toEqual({
    id: world.splitting.ids.expenses.get('機票'),
    item: '機票',
    amount: '8000',
    currencyCode: 'TWD',
    spentOn: '2027-01-15',
    categoryId: null,
  });
  expect(world.get('splitting:expenseId')).toBe(world.splitting.ids.expenses.get('機票'));
  expect(world.response!.status()).toBe(201);
});
