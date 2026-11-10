import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { seedBrowserSplittingExpenses } from './fixture.js';
import { fillIndependentRepaymentDraft, type RepaymentDraft } from './repayment-draft.js';
import {
  arrangeLostRepaymentResponse,
  assertRepaymentPayload,
  lostRepaymentTemporaryPhrase,
  lostRepaymentResponseKey,
  type LostRepaymentResponseState,
} from './lost-repayment-response.js';

const draft: RepaymentDraft = {
  id: 'original-reserved-id',
  payerMemberId: 'amy-id',
  payeeMemberId: 'alice-id',
  currencyCode: 'JPY',
  amount: '400',
  paidOn: '2027-03-12',
};

test('T134: original UUID and all draft fields must survive the response loss', () => {
  assertRepaymentPayload({ ...draft }, draft);
  for (const mutation of [
    { id: 'replacement-id' },
    { payerMemberId: 'alice-id' },
    { payeeMemberId: 'amy-id' },
    { currencyCode: 'TWD' },
    { amount: '401' },
    { paidOn: '2027-03-11' },
    { overpaymentConfirmation: {} },
  ])
    expect(() => assertRepaymentPayload({ ...draft, ...mutation }, draft)).toThrow();
});

test('T134: isolated Given arms temporary original-UUID 404 without saving the draft', async ({
  page,
  world,
}) => {
  await seedBrowserSplittingExpenses(page, world, [
    { 項目: '代付', 幣別: 'JPY', 金額: '1000', 付款人: 'Alice', 分攤者: 'Amy' },
    { 項目: '台幣代付', 幣別: 'TWD', 金額: '300', 付款人: 'Alice', 分攤者: 'Amy' },
  ]);
  await fillIndependentRepaymentDraft(page, world, 'Alice', '400');
  await runIsolatedStep(
    {
      phrase: lostRepaymentTemporaryPhrase,
      input: undefined,
      execute: async (context) =>
        arrangeLostRepaymentResponse(page, context, 'temporary-not-found'),
    },
    world,
  );
  const state = world.get<LostRepaymentResponseState>(lostRepaymentResponseKey);
  try {
    expect(state.availability).toBe('temporary-not-found');
    expect(state.ids.commandId).toBe(state.draft.id);
    expect(state.mutations).toEqual([]);
    expect(state.lookups).toEqual([]);
    expect(state.authoritativeAfter).toBeUndefined();
    expect(state.savedResponse).toBeUndefined();
  } finally {
    await state.interceptor?.restore();
  }
});
