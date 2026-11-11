import { test, expect } from '../fixtures.js';
import { seedTrip } from '../../../../api/tests/support/seed.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { login } from '../browser.js';
import { amountInput } from '../expense-helpers.js';
import { fillSharedSnackDraft, SharedExpenseForm } from './expense-draft.js';
import { fillMissingPayerDraft } from './missing-payer-draft.js';
import { fillSnackWithoutShares } from './empty-expense-shares.js';
import {
  saveSharedExpense,
  saveSharedExpensePhrase,
  observeSingleExpenseSubmission,
  expenseSubmissionOutcome,
} from './save-shared-expense.js';

test('T145: a server failure cannot prove the creation was rejected', () => {
  expect(expenseSubmissionOutcome(201)).toBe('saved');
  for (const status of [400, 401, 404, 409, 422])
    expect(expenseSubmissionOutcome(status)).toBe('rejected');
  for (const status of [500, 502, 503, 504])
    expect(expenseSubmissionOutcome(status)).toBe('unconfirmed');
});

for (const members of ['Alice、Amy、Bob', 'Amy、Bob'])
  test(`T145: isolated When saves one ${members} shared expense`, async ({ page, world }) => {
    await fillSharedSnackDraft(page, world, members);
    await runIsolatedStep(
      {
        phrase: saveSharedExpensePhrase,
        input: undefined,
        execute: (context) => saveSharedExpense(page, context),
      },
      world,
    );
  });

for (const [name, arrange] of [
  ['missing payer', fillMissingPayerDraft],
  ['empty shares', fillSnackWithoutShares],
] as const)
  test(`T145: one save reaches local validation without waiting for a POST: ${name}`, async ({
    page,
    world,
  }) => {
    await arrange(page, world);
    await saveSharedExpense(page, world);
  });

test('T145: the actual product create payload must carry payer and shares', async ({
  page,
  world,
}) => {
  const trip = await seedTrip(world, '日本旅行');
  await login(page, world);
  const form = new SharedExpenseForm(page);
  await form.open(trip.id);
  await form.fillSnack();
  const observed = await observeSingleExpenseSubmission(page, trip.id);
  expect(observed.request, 'A valid filled expense must submit once').not.toBeNull();
  expect(observed.request!.postDataJSON()).toHaveProperty('payerMemberId');
  expect(observed.request!.postDataJSON()).toHaveProperty('shareMemberIds');
});

test('T145: the actual form can block a save locally without a POST timeout', async ({
  page,
  world,
}) => {
  const trip = await seedTrip(world, '日本旅行');
  await login(page, world);
  const form = new SharedExpenseForm(page);
  await form.open(trip.id);
  await form.fillSnack();
  await amountInput(page).clear();
  const observed = await observeSingleExpenseSubmission(page, trip.id);
  expect(observed).toEqual({ request: null, response: null, outcome: 'local-validation' });
  await expect(amountInput(page)).toHaveAttribute('aria-invalid', 'true');
});
