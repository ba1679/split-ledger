import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { seedBrowserSplittingExpenses, type BrowserSplittingSnapshot } from './fixture.js';
import { deleteSharedExpense, type ExpenseDeletion } from './delete-shared-expense.js';
import {
  assertDeletedDinner,
  assertDeletedDinnerProjection,
  deletedDinnerResultPhrase,
} from './deleted-dinner-result.js';

function deletedDinner(): ExpenseDeletion {
  const sources = {
    trips: [],
    members: [],
    expenses: [{ id: 'dinner' }],
    shares: [{ expense_id: 'dinner' }],
    repayments: [],
    settlements: [],
    adjustments: [],
  };
  const after = {
    sources: { ...sources, expenses: [], shares: [] },
    expenses: { items: [], totalCount: 0, nextCursor: null },
    settlement: { accountingRevision: '2', simplifyDebts: false, balances: [], arrangements: [] },
  } as unknown as BrowserSplittingSnapshot;

  return {
    expenseId: 'dinner',
    tripId: 'trip',
    item: '晚餐',
    status: 204,
    reply: '',
    mutations: [{ method: 'DELETE', path: '/api/trips/trip/expenses/dinner', payload: null }],
    before: {
      sources,
      expenses: { items: [{ id: 'dinner' }] },
      settlement: { accountingRevision: '1' },
    } as unknown as BrowserSplittingSnapshot,
    after,
    browserSettlement: structuredClone(after.settlement),
  };
}

test('T178: no source, share, stale debt or payment arrangement may remain after sole dinner deletion', () => {
  assertDeletedDinnerProjection(deletedDinner());
  const zero = deletedDinner();
  zero.after.settlement.balances = [
    {
      memberId: 'Amy',
      currencyCode: 'JPY',
      netAmount: { numerator: '0', denominator: '1', minorUnit: 0 },
    },
  ];
  zero.browserSettlement = structuredClone(zero.after.settlement);
  assertDeletedDinnerProjection(zero);
  for (const mutate of [
    (state: ExpenseDeletion) => {
      state.after.sources = { ...state.after.sources, shares: [{ expense_id: 'dinner' }] };
    },
    (state: ExpenseDeletion) => {
      state.after.expenses.totalCount = 1;
    },
    (state: ExpenseDeletion) => {
      state.after.settlement.arrangements = [{ key: 'stale' } as never];
    },
    (state: ExpenseDeletion) => {
      state.after.settlement.balances = [
        {
          memberId: 'Amy',
          currencyCode: 'JPY',
          netAmount: { numerator: '-100', denominator: '1', minorUnit: 0 },
        },
      ];
    },
    (state: ExpenseDeletion) => {
      state.browserSettlement.accountingRevision = '1';
    },
  ]) {
    const state = deletedDinner();
    mutate(state);
    expect(() => assertDeletedDinnerProjection(state)).toThrow();
  }
});

test('T178: isolated Then reads the original deleted UUID and latest settlement after real UI deletion', async ({
  page,
  world,
}) => {
  await seedBrowserSplittingExpenses(page, world, [
    { 項目: '晚餐', 幣別: 'JPY', 金額: '200', 付款人: 'Amy', 分攤者: 'Amy、Bob' },
  ]);
  await deleteSharedExpense(page, world, '晚餐');
  await runIsolatedStep(
    {
      phrase: deletedDinnerResultPhrase,
      input: undefined,
      execute: async (context) => assertDeletedDinner(page, context),
    },
    world,
  );
});
