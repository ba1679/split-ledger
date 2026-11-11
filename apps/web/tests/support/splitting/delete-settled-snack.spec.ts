import { test } from '../fixtures.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { seedBrowserSplittingExpenses } from './fixture.js';
import { settleBrowserAmyArrangement } from './settled-arrangement-fixture.js';
import { deleteSharedExpense } from './delete-shared-expense.js';

test('T148: isolated When deletes only the snack while retaining actual settlement history', async ({
  page,
  world,
}) => {
  await seedBrowserSplittingExpenses(page, world, [
    { 項目: '點心', 幣別: 'JPY', 金額: '100', 付款人: 'Alice', 分攤者: 'Alice、Amy、Bob' },
  ]);
  await settleBrowserAmyArrangement(world);
  await runIsolatedStep(
    {
      phrase: 'owner 刪除共同支出點心',
      input: undefined,
      execute: async (context) => deleteSharedExpense(page, context, '點心'),
    },
    world,
  );
});
