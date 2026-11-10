import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from './harness.js';
import { deleteSharedDinner } from './delete-dinner-command.js';
import { seedSplittingExpenses } from './expense-fixture.js';

test('T032 isolated dinner deletion retains its ID and removes only its source rows', async ({
  world,
}) => {
  await seedSplittingExpenses(world, [
    { 項目: '晚餐', 幣別: 'JPY', 金額: '300', 付款人: 'Alice', 分攤者: 'Alice、Amy、Bob' },
    { 項目: '住宿', 幣別: 'JPY', 金額: '200', 付款人: 'Amy', 分攤者: 'Bob' },
  ]);
  const expenseId = world.splitting.ids.expenses.get('晚餐');
  await runIsolatedStep(
    { phrase: 'owner 刪除共同晚餐支出', input: undefined, execute: deleteSharedDinner },
    world,
  );
  expect(world.get('splitting:expenseId')).toBe(expenseId);
  expect(world.response!.status()).toBe(204);
  expect(world.splitting.snapshot!.expenses.map((expense) => expense.item)).toEqual(['住宿']);
});
