import { test, expect } from '../fixtures.js';
import { seedTrip } from '../../../../api/tests/support/seed.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { login } from '../browser.js';
import { seedBrowserSplittingExpenses } from './fixture.js';
import {
  IndependentRepaymentForm,
  fillIndependentRepaymentDraft,
  repaymentDraftValues,
  repaymentDraftPhrase,
} from './repayment-draft.js';

test('T130: raw same-person and zero validation drafts remain intact', () => {
  expect(repaymentDraftValues('Amy', '100')).toMatchObject({ payee: 'Amy', amount: '100' });
  expect(repaymentDraftValues('Alice', '0')).toMatchObject({ payee: 'Alice', amount: '0' });
  expect(repaymentDraftValues('Alice', '000400').amount).toBe('000400');
  expect(() => repaymentDraftValues('Carol', '100')).toThrow();
});

for (const [payee, amount] of [
  ['Alice', '400'],
  ['Amy', '100'],
  ['Alice', '0'],
] as const)
  test(`T130: isolated unsaved Given Amy to ${payee} JPY ${amount}`, async ({ page, world }) => {
    await seedBrowserSplittingExpenses(page, world, [
      { 項目: '代付', 幣別: 'JPY', 金額: '1000', 付款人: 'Alice', 分攤者: 'Amy' },
      { 項目: '台幣代付', 幣別: 'TWD', 金額: '300', 付款人: 'Alice', 分攤者: 'Amy' },
    ]);
    await runIsolatedStep(
      {
        phrase: repaymentDraftPhrase,
        input: { payee, amount },
        execute: (context, value) =>
          fillIndependentRepaymentDraft(page, context, value.payee, value.amount),
      },
      world,
    );
  });

test('T130: actual independent repayment page must expose the payer form control', async ({
  page,
  world,
}) => {
  const trip = await seedTrip(world, '日本旅行');
  await login(page, world);
  await new IndependentRepaymentForm(page).open(trip.id);
});
