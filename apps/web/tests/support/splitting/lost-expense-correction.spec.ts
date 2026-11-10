import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import {
  arrangeLostExpenseCorrection,
  assertDinnerCorrectionPayload,
  assertSavedDinnerCorrection,
  lostExpenseCorrectionPhrase,
  lostExpenseCorrectionKey,
  type LostExpenseCorrectionState,
} from './lost-expense-correction.js';
import type { SharedExpenseDraft } from './expense-draft.js';
import type { BrowserExpense } from './fixture.js';

const draft: SharedExpenseDraft = {
  item: '晚餐',
  amount: '200',
  currencyCode: 'JPY',
  spentOn: '2027-03-11',
  categoryId: null,
  payerMemberId: 'alice-id',
  shareMemberIds: ['alice-id', 'amy-id', 'bob-id'],
};

test('T118: correction keeps the original payer, participants, currency and date', () => {
  assertDinnerCorrectionPayload({ amount: '200' }, draft);
  assertDinnerCorrectionPayload({ ...draft }, draft);
  for (const mutation of [
    { amount: '300' },
    { amount: '200', currencyCode: 'TWD' },
    { amount: '200', payerMemberId: 'amy-id' },
    { amount: '200', shareMemberIds: ['amy-id', 'bob-id'] },
    { amount: '200', spentOn: '2027-03-12' },
  ])
    expect(() => assertDinnerCorrectionPayload(mutation, draft)).toThrow();
});

test('T118: saved dinner permits a refreshed updatedAt but preserves createdAt and business fields', () => {
  const before: BrowserExpense & { createdAt: string; updatedAt: string } = {
    id: 'expense-id',
    tripId: 'trip-id',
    item: '晚餐',
    amount: '300',
    currencyCode: 'JPY',
    minorUnit: 0,
    spentOn: '2027-03-11',
    category: null,
    payerMemberId: 'alice-id',
    shares: ['alice-id', 'amy-id', 'bob-id'].map((memberId) => ({
      memberId,
      amount: { numerator: '100', denominator: '1', minorUnit: 0 },
    })),
    createdAt: '2027-03-11T01:00:00.000Z',
    updatedAt: '2027-03-11T01:00:00.000Z',
  };
  const after = { ...before, amount: '200', updatedAt: '2027-03-11T02:00:00.000Z' };
  assertSavedDinnerCorrection(before, after);
  for (const mutation of [
    { createdAt: '2027-03-11T02:00:00.000Z' },
    { spentOn: '2027-03-12' },
    { payerMemberId: 'amy-id' },
    { category: { id: 'category-id', name: '餐飲' } },
    { updatedAt: 'invalid' },
  ])
    expect(() => assertSavedDinnerCorrection(before, { ...after, ...mutation })).toThrow();
});

test('T118: isolated Given arms a real PATCH loss without submitting a draft', async ({
  page,
  world,
}) => {
  await runIsolatedStep(
    {
      phrase: lostExpenseCorrectionPhrase,
      input: undefined,
      execute: async (context) => arrangeLostExpenseCorrection(page, context),
    },
    world,
  );
  const state = world.get<LostExpenseCorrectionState>(lostExpenseCorrectionKey);
  expect(state.mutations).toEqual([]);
  expect(state.authoritativeAfter).toBeUndefined();
  expect(state.ids.commandId).toBe(state.expenseId);
  expect(state.verificationAvailable).toBe(false);
});
