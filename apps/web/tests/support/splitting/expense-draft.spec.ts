import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { seedTrip } from '../../../../api/tests/support/seed.js';
import { login } from '../browser.js';
import {
  fillSharedSnackDraft,
  parseExpenseShareNames,
  SharedExpenseForm,
  sharedExpenseDraftPhrase,
  sharedExpenseDraftKey,
  type SharedExpenseDraft,
} from './expense-draft.js';

test('T114: share collection preserves valid participants and rejects empty, duplicate or foreign names', () => {
  expect(parseExpenseShareNames('Alice、Amy、Bob')).toEqual(['Alice', 'Amy', 'Bob']);
  expect(parseExpenseShareNames('Amy、Bob')).toEqual(['Amy', 'Bob']);
  for (const collection of ['', 'Amy、Amy', 'Carol', 'Amy、'])
    expect(() => parseExpenseShareNames(collection)).toThrow();
});

for (const members of ['Alice、Amy、Bob', 'Amy、Bob'])
  test(`T114: isolated Given fills an unsaved real shared expense with ${members}`, async ({
    page,
    world,
  }) => {
    await runIsolatedStep(
      {
        phrase: sharedExpenseDraftPhrase,
        input: members,
        execute: async (context, value) => fillSharedSnackDraft(page, context, value),
      },
      world,
    );
    const draft = world.get<SharedExpenseDraft>(sharedExpenseDraftKey);
    expect(draft.shareMemberIds).toEqual(
      parseExpenseShareNames(members).map((name) => world.splitting.ids.members.get(name)),
    );
    expect(draft.payerMemberId).toBe(world.splitting.ids.members.get('Alice'));
  });

test('T114: existing product form must expose a visible Alice payer radio', async ({
  page,
  world,
}) => {
  // Independent DOM contract check reaches the current UI even before the 005 migration exists.
  const trip = await seedTrip(world, '日本旅行');
  await login(page, world);
  const form = new SharedExpenseForm(page);
  await form.open(trip.id);
  await form.fillSnack();
  await form.choosePayer('Alice');
});
