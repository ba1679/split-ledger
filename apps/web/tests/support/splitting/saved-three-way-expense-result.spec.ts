import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { fillSharedSnackDraft } from './expense-draft.js';
import { saveSharedExpense } from './save-shared-expense.js';
import {
  assertSavedThreeWayExpense,
  assertThreeWayExpenseProjection,
  savedThreeWayExpensePhrase,
} from './saved-three-way-expense-result.js';
import type { BrowserSplittingSnapshot } from './fixture.js';

function snapshot(): BrowserSplittingSnapshot {
  const fifty = { numerator: '100', denominator: '3', minorUnit: 0 };

  return {
    sources: {
      members: ['Alice', 'Amy', 'Bob'].map((name) => ({ id: name, name })),
      expenses: [
        {
          id: 'snack',
          payer_member_id: 'Alice',
          amount_minor: '100',
          currency_code: 'JPY',
          minor_unit: 0,
        },
      ],
      shares: ['Alice', 'Amy', 'Bob'].map((id) => ({
        expense_id: 'snack',
        member_id: id,
        amount_numerator: '100',
        amount_denominator: '3',
        minor_unit: 0,
      })),
      repayments: [],
      settlements: [],
      adjustments: [],
      trips: [],
    },
    expenses: {
      items: [
        {
          id: 'snack',
          item: '點心',
          currencyCode: 'JPY',
          payerMemberId: 'Alice',
          amount: '100',
          minorUnit: 0,
          shares: ['Alice', 'Amy', 'Bob'].map((memberId) => ({ memberId, amount: fifty })),
        },
      ],
      totalCount: 1,
      nextCursor: null,
    },
    settlement: {
      accountingRevision: '1',
      simplifyDebts: false,
      balances: ['Alice', 'Amy', 'Bob'].map((memberId) => ({
        memberId,
        currencyCode: 'JPY',
        netAmount: { ...fifty, numerator: memberId === 'Alice' ? '200' : '-100' },
      })),
      arrangements: ['Amy', 'Bob'].map((id) => ({
        key: id,
        debtorMemberId: id,
        creditorMemberId: 'Alice',
        currencyCode: 'JPY',
        amount: fifty,
      })),
    },
  } as unknown as BrowserSplittingSnapshot;
}

test('T182: thirds remain exact in source, shares, balances and recommendations', () => {
  assertThreeWayExpenseProjection(snapshot(), 'snack');
  for (const mutate of [
    (state: BrowserSplittingSnapshot) => {
      state.expenses.items[0]!.shares[0]!.memberId = 'Amy';
    },
    (state: BrowserSplittingSnapshot) => {
      state.expenses.items[0]!.payerMemberId = 'Amy';
    },
    (state: BrowserSplittingSnapshot) => {
      state.settlement.balances[0]!.netAmount = {
        ...state.settlement.balances[0]!.netAmount,
        numerator: '67',
      };
    },
    (state: BrowserSplittingSnapshot) => {
      state.settlement.arrangements[0]!.creditorMemberId = 'Amy';
    },
    (state: BrowserSplittingSnapshot) => {
      state.settlement.arrangements.pop();
    },
    (state: BrowserSplittingSnapshot) => {
      state.sources = {
        ...state.sources,
        shares: [...state.sources.shares, { expense_id: 'snack', member_id: 'Alice' }],
      };
    },
  ]) {
    const state = snapshot();
    mutate(state);
    expect(() => assertThreeWayExpenseProjection(state, 'snack')).toThrow();
  }
});

test('T182: isolated Then checks real saved three-way expense UI and authority', async ({
  page,
  world,
}) => {
  await fillSharedSnackDraft(page, world, 'Alice、Amy、Bob');
  await saveSharedExpense(page, world);
  await runIsolatedStep(
    {
      phrase: savedThreeWayExpensePhrase,
      input: undefined,
      execute: async (context) => assertSavedThreeWayExpense(page, context),
    },
    world,
  );
});
