import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from './harness.js';
import { seedSplittingExpenses } from './expense-fixture.js';
import { splittingMemberId } from './members-fixture.js';
import { replaceDinnerSharing } from './replace-dinner-sharing-command.js';

test('T039 isolated command replaces dinner payer and complete sharing set', async ({ world }) => {
  await seedSplittingExpenses(world, [
    { 項目: '晚餐', 幣別: 'JPY', 金額: '300', 付款人: 'Alice', 分攤者: 'Alice、Amy、Bob' },
  ]);
  await runIsolatedStep(
    {
      phrase: 'owner 將晚餐改為由 Amy 付款並由 Amy 與 Bob 分攤 JPY 200',
      input: undefined,
      execute: replaceDinnerSharing,
    },
    world,
  );
  expect(world.get('splitting:expenseRequest')).toEqual({
    amount: '200',
    payerMemberId: splittingMemberId(world, 'Amy'),
    shareMemberIds: [splittingMemberId(world, 'Amy'), splittingMemberId(world, 'Bob')],
  });
});
