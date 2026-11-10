import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import {
  arrangeLostExpenseCorrection,
  type LostExpenseCorrectionState,
} from './lost-expense-correction.js';
import { saveExpenseCorrection } from './save-expense-correction.js';
import {
  assertUnconfirmedCorrectionAuthority,
  assertUnconfirmedExpenseCorrection,
  unconfirmedExpenseCorrectionPhrase,
} from './unconfirmed-expense-correction-result.js';
import type { BrowserSplittingSnapshot } from './fixture.js';

const snapshot = (amount: string, revision: string): BrowserSplittingSnapshot => ({
  sources: {
    trips: [],
    members: [],
    expenses: [],
    shares: [],
    repayments: [],
    settlements: [],
    adjustments: [],
  },
  expenses: {
    items: [{ id: 'dinner', amount } as BrowserSplittingSnapshot['expenses']['items'][number]],
    totalCount: 1,
    nextCursor: null,
  },
  settlement: {
    accountingRevision: revision,
    simplifyDebts: false,
    arrangements: [],
    balances: [
      {
        memberId: 'Alice',
        currencyCode: 'JPY',
        netAmount: {
          numerator: amount === '300' ? '200' : '400',
          denominator: amount === '300' ? '1' : '3',
          minorUnit: 0,
        },
      },
    ],
  },
  repayments: { items: [] },
  totals: { totals: [] },
});
const fixture = (): LostExpenseCorrectionState => ({
  expenseId: 'dinner',
  tripId: 'trip',
  before: snapshot('300', '1'),
  draft: {
    item: '晚餐',
    amount: '200',
    currencyCode: 'JPY',
    spentOn: '2027-03-11',
    categoryId: null,
    payerMemberId: 'Alice',
    shareMemberIds: ['Alice', 'Amy', 'Bob'],
  },
  ids: { commandId: 'dinner', mutationIds: ['dinner'], lookupIds: ['dinner'] },
  mutations: [
    { method: 'PATCH', path: '/api/trips/trip/expenses/dinner', body: { amount: '200' } },
  ],
  lookups: ['dinner'],
  blockedProjectionReads: [],
  verificationAvailable: false,
  authoritativeAfter: snapshot('200', '2'),
});

test('T174: unknown UI outcome remains distinct from real committed authority and immutable history', () => {
  const state = fixture();
  assertUnconfirmedCorrectionAuthority(state, state.authoritativeAfter!);
  expect(() => assertUnconfirmedCorrectionAuthority(state, state.before)).toThrow();
  for (const mutate of [
    (value: LostExpenseCorrectionState) => {
      value.verificationAvailable = true;
    },
    (value: LostExpenseCorrectionState) => {
      value.authoritativeAfter = undefined;
    },
    (value: LostExpenseCorrectionState) => {
      value.mutations.push(value.mutations[0]!);
    },
    (value: LostExpenseCorrectionState) => {
      value.authoritativeAfter!.sources = {
        ...value.authoritativeAfter!.sources,
        repayments: [{ id: 'unexpected' }],
      };
    },
    (value: LostExpenseCorrectionState) => {
      value.authoritativeAfter!.settlement.accountingRevision = '3';
    },
    (value: LostExpenseCorrectionState) => {
      value.authoritativeAfter!.settlement.balances = value.before.settlement.balances;
    },
  ]) {
    const value = fixture();
    mutate(value);
    expect(() =>
      assertUnconfirmedCorrectionAuthority(value, value.authoritativeAfter ?? snapshot('200', '2')),
    ).toThrow();
  }
});

test('T174: isolated Then retains the draft and never reconciles or resends the unknown write', async ({
  page,
  world,
}) => {
  await arrangeLostExpenseCorrection(page, world);
  await saveExpenseCorrection(page, world);
  await runIsolatedStep(
    {
      phrase: unconfirmedExpenseCorrectionPhrase,
      input: undefined,
      execute: async (context) => assertUnconfirmedExpenseCorrection(page, context),
    },
    world,
  );
});
