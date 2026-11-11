import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import {
  arrangeLostExpenseCorrection,
  type LostExpenseCorrectionState,
} from './lost-expense-correction.js';
import {
  assertSingleCorrectionSubmission,
  saveExpenseCorrection,
  saveExpenseCorrectionPhrase,
} from './save-expense-correction.js';

const submission = (): LostExpenseCorrectionState => ({
  expenseId: 'original-expense',
  tripId: 'trip',
  before: {} as LostExpenseCorrectionState['before'],
  draft: {
    item: '晚餐',
    amount: '200',
    currencyCode: 'JPY',
    spentOn: '2027-03-11',
    categoryId: null,
    payerMemberId: 'alice',
    shareMemberIds: ['alice', 'amy', 'bob'],
  },
  ids: { commandId: 'original-expense', mutationIds: ['original-expense'], lookupIds: [] },
  mutations: [
    { method: 'PATCH', path: '/api/trips/trip/expenses/original-expense', body: { amount: '200' } },
  ],
  lookups: [],
  blockedProjectionReads: [],
  verificationAvailable: false,
});

test('T146: correction submission rejects resends, replacement IDs, wrong route and changed draft', () => {
  assertSingleCorrectionSubmission(submission());
  const original = submission();
  expect(() =>
    assertSingleCorrectionSubmission({
      ...original,
      ids: { ...original.ids, commandId: 'replacement' },
    }),
  ).toThrow();
  for (const change of [
    (state: LostExpenseCorrectionState) => state.mutations.push(state.mutations[0]!),
    (state: LostExpenseCorrectionState) => {
      state.mutations[0]!.method = 'POST';
    },
    (state: LostExpenseCorrectionState) => {
      state.mutations[0]!.path = '/api/trips/trip/expenses/new';
    },
    (state: LostExpenseCorrectionState) => {
      state.mutations[0]!.body.amount = '300';
    },
    (state: LostExpenseCorrectionState) => state.ids.lookupIds.push('replacement'),
  ]) {
    const state = submission();
    change(state);
    expect(() => assertSingleCorrectionSubmission(state)).toThrow();
  }
});

test('T146: isolated When clicks once and distinguishes a landed PATCH from the unknown browser outcome', async ({
  page,
  world,
}) => {
  await arrangeLostExpenseCorrection(page, world);
  await runIsolatedStep(
    {
      phrase: saveExpenseCorrectionPhrase,
      input: undefined,
      execute: async (context) => saveExpenseCorrection(page, context),
    },
    world,
  );
});
