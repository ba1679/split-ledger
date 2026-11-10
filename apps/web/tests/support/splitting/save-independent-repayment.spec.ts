import { test, expect } from '../fixtures.js';
import { seedTrip } from '../../../../api/tests/support/seed.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { login } from '../browser.js';
import { seedBrowserSplittingExpenses } from './fixture.js';
import { fillIndependentRepaymentDraft, IndependentRepaymentForm } from './repayment-draft.js';
import {
  repaymentSubmissionOutcome,
  saveIndependentRepayment,
  saveIndependentRepaymentPhrase,
} from './save-independent-repayment.js';

test('T164: server failures remain uncertain while known 201/409 outcomes are distinguished', () => {
  expect(repaymentSubmissionOutcome(201)).toBe('saved');
  expect(repaymentSubmissionOutcome(409)).toBe('warning');
  for (const status of [400, 401, 404, 422])
    expect(repaymentSubmissionOutcome(status)).toBe('rejected');
  for (const status of [500, 502, 503, 504])
    expect(repaymentSubmissionOutcome(status)).toBe('unconfirmed');
});

for (const [payee, amount] of [
  ['Alice', '400'],
  ['Alice', '700'],
  ['Amy', '100'],
  ['Alice', '0'],
] as const)
  test(`T164: isolated save Amy to ${payee} JPY ${amount}`, async ({ page, world }) => {
    await seedBrowserSplittingExpenses(page, world, [
      { 項目: '代付', 幣別: 'JPY', 金額: '1000', 付款人: 'Alice', 分攤者: 'Amy' },
      { 項目: '台幣代付', 幣別: 'TWD', 金額: '300', 付款人: 'Alice', 分攤者: 'Amy' },
    ]);
    await fillIndependentRepaymentDraft(page, world, payee, amount);
    await runIsolatedStep(
      {
        phrase: saveIndependentRepaymentPhrase,
        input: undefined,
        execute: (context) => saveIndependentRepayment(page, context),
      },
      world,
    );
  });

test('T164: actual repayment route must expose its save action', async ({ page, world }) => {
  const trip = await seedTrip(world, '日本旅行');
  await login(page, world);
  await new IndependentRepaymentForm(page).open(trip.id);
  await expect(page.getByRole('button', { name: '儲存還款', exact: true })).toBeVisible();
});
