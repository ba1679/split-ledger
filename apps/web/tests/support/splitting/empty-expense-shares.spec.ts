import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { seedTrip } from '../../../../api/tests/support/seed.js';
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
  // This independent UI check reaches the product before the 005 migration exists.
  const trip = await seedTrip(world, '日本旅行');
  await login(page, world);
  const form = new SharedExpenseForm(page);
  await form.open(trip.id);
  await form.fillSnack();
  await form.chooseShares(['Alice', 'Amy', 'Bob']);
  await form.chooseShares([]);
});
