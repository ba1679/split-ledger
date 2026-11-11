import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import {
  seedSplittingMembers,
  splittingTripId,
} from '../../../../api/tests/support/splitting/members-fixture.js';
import { login } from '../browser.js';
import { emptyExpenseSharesPhrase, fillSnackWithoutShares } from './empty-expense-shares.js';
import {
  SharedExpenseForm,
  sharedExpenseDraftKey,
  sharedExpensePostsKey,
  type SharedExpenseDraft,
} from './expense-draft.js';

test('T116: isolated Given leaves a valid snack draft with Alice payer and no shares', async ({
  page,
  world,
}) => {
  await runIsolatedStep(
    {
      phrase: emptyExpenseSharesPhrase,
      input: undefined,
      execute: async (context) => fillSnackWithoutShares(page, context),
    },
    world,
  );
  expect(world.get<SharedExpenseDraft>(sharedExpenseDraftKey)).toEqual({
    item: '點心',
    amount: '100',
    currencyCode: 'JPY',
    spentOn: '2027-03-11',
    categoryId: null,
    payerMemberId: world.splitting.ids.members.get('Alice'),
    shareMemberIds: [],
  });
  expect(world.get<unknown[]>(sharedExpensePostsKey)).toEqual([]);
});

test('T116: current form must expose sharing checkboxes that can all be cleared', async ({
  page,
  world,
}) => {
  await seedSplittingMembers(world);
  await login(page, world);
  const form = new SharedExpenseForm(page);
  await form.open(splittingTripId(world));
  await form.fillSnack();
  await form.chooseShares(['Alice', 'Amy', 'Bob']);
  await form.chooseShares([]);
});
