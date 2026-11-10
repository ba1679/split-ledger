import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { seedBrowserSplittingExpenses } from './fixture.js';
import {
  assertSingleExpenseDeletion,
  deleteDinnerPhrase,
  deleteSharedExpense,
  type ExpenseDeletion,
} from './delete-shared-expense.js';

function deletion(): ExpenseDeletion {
  const sources = {
    trips: [],
    members: [],
    expenses: [{ id: 'original' }],
    shares: [{ expense_id: 'original' }],
    repayments: [{ id: 'payment' }],
    settlements: [{ id: 'settlement' }],
    adjustments: [{ id: 'adjustment' }],
  };

  return {
    expenseId: 'original',
    tripId: 'trip',
    item: '晚餐',
    mutations: [{ method: 'DELETE', path: '/api/trips/trip/expenses/original', payload: null }],
    browserSettlement: { accountingRevision: '3' } as ExpenseDeletion['browserSettlement'],
    status: 204,
    reply: '',
    before: {
      sources,
      settlement: { accountingRevision: '2' },
    } as unknown as ExpenseDeletion['before'],
    after: {
      sources: { ...structuredClone(sources), expenses: [], shares: [] },
      settlement: { accountingRevision: '3' },
      expenses: { items: [] },
    } as unknown as ExpenseDeletion['after'],
  };
}

test('T147: delete rejects duplicate commands, wrong UUID and removal of immutable payment history', () => {
  assertSingleExpenseDeletion(deletion());
  for (const mutate of [
    (state: ExpenseDeletion) => {
      state.browserSettlement.accountingRevision = '2';
    },
    (state: ExpenseDeletion) => state.mutations.push(state.mutations[0]!),
    (state: ExpenseDeletion) => {
      state.mutations[0]!.path += '-new';
    },
    (state: ExpenseDeletion) => {
      state.mutations[0]!.payload = '{}';
    },
    (state: ExpenseDeletion) => {
      state.after.sources = { ...state.after.sources, repayments: [] };
    },
    (state: ExpenseDeletion) => {
      state.after.sources = { ...state.after.sources, settlements: [] };
    },
    (state: ExpenseDeletion) => {
      state.after.sources = { ...state.after.sources, adjustments: [] };
    },
    (state: ExpenseDeletion) => {
      state.after.sources = { ...state.after.sources, shares: state.before.sources.shares };
    },
  ]) {
    const state = deletion();
    mutate(state);
    expect(() => assertSingleExpenseDeletion(state)).toThrow();
  }
});

test('T147: isolated When confirms one dinner deletion and reads refreshed authoritative sources', async ({
  page,
  world,
}) => {
  await seedBrowserSplittingExpenses(page, world, [
    { 項目: '晚餐', 幣別: 'JPY', 金額: '200', 付款人: 'Amy', 分攤者: 'Amy、Bob' },
  ]);
  await runIsolatedStep(
    {
      phrase: deleteDinnerPhrase,
      input: undefined,
      execute: async (context) => deleteSharedExpense(page, context, '晚餐'),
    },
    world,
  );
});
