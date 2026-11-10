import { test, expect } from '../fixtures.js';
import { seedSplittingExpenses } from './expense-fixture.js';
import { captureCurrentAmyArrangement } from './current-arrangement-fixture.js';
import { requestAmySettlement } from './settle-amy-command.js';
import { runIsolatedStep } from './harness.js';
import {
  assertPreservedSettledExpense,
  assertPreservedSnackView,
  assertSettlementPreservesExpenseSources,
  preservedSettledExpensePhrase,
} from './preserved-settled-expense-result.js';
import type { SourceSnapshot } from './types.js';

const ids = ['Alice', 'Amy', 'Bob'];
const before: SourceSnapshot = {
  trips: [{ accounting_revision: '0' }],
  members: [],
  repayments: [],
  settlements: [],
  adjustments: [],
  expenses: [
    {
      id: 'snack',
      trip_id: 'trip',
      item: '點心',
      amount_minor: '100',
      currency_code: 'JPY',
      minor_unit: 0,
      spent_on: '2027-01-20',
      category_id: null,
      payer_member_id: 'Alice',
      created_at: '2027-01-20T00:00:00.000Z',
      updated_at: '2027-01-20T00:00:00.000Z',
    },
  ],
  shares: ids.map((member_id) => ({ expense_id: 'snack', member_id })),
};
const view = {
  id: 'snack',
  tripId: 'trip',
  item: '點心',
  amount: '100',
  currencyCode: 'JPY',
  minorUnit: 0,
  spentOn: '2027-01-20',
  category: null,
  payerMemberId: 'Alice',
  createdAt: '2027-01-20T00:00:00.000Z',
  updatedAt: '2027-01-20T00:00:00.000Z',
  shares: ids.map((memberId) => ({
    memberId,
    amount: { numerator: '100', denominator: '3', minorUnit: 0 },
  })),
};

test('T094 preserves all expense columns and complete share rows while allowing settlement additions', () => {
  expect(preservedSettledExpensePhrase).toBe('結清後原支出與分攤集合保持不變');
  const after = {
    ...before,
    trips: [{ accounting_revision: '1' }],
    settlements: [{ id: 's' }],
    repayments: [{ id: 'r' }],
    adjustments: [{ id: 'a' }, { id: 'b' }],
  };
  expect(() => assertSettlementPreservesExpenseSources(before, after)).not.toThrow();
  for (const key of [
    'amount_minor',
    'currency_code',
    'spent_on',
    'category_id',
    'payer_member_id',
    'updated_at',
  ])
    expect(() =>
      assertSettlementPreservesExpenseSources(before, {
        ...after,
        expenses: [{ ...before.expenses[0], [key]: 'changed' }],
      }),
    ).toThrow();
  expect(() =>
    assertSettlementPreservesExpenseSources(before, { ...after, shares: before.shares.slice(1) }),
  ).toThrow();
  expect(() =>
    assertSettlementPreservesExpenseSources(before, {
      ...after,
      shares: [...before.shares, before.shares[0]!],
    }),
  ).toThrow();
});

test('T094 original expense GET retains exact 100/3 shares and source metadata', () => {
  expect(() => assertPreservedSnackView(view, before, 'snack', ids)).not.toThrow();
  const rounded = {
    ...view,
    shares: view.shares.map((share, index) => ({
      ...share,
      amount: { numerator: index ? '33' : '34', denominator: '1', minorUnit: 0 },
    })),
  };
  expect(() => assertPreservedSnackView(rounded, before, 'snack', ids)).toThrow();
  expect(() =>
    assertPreservedSnackView({ ...view, payerMemberId: 'Amy' }, before, 'snack', ids),
  ).toThrow();
  expect(() =>
    assertPreservedSnackView({ ...view, spentOn: '2027-01-21' }, before, 'snack', ids),
  ).toThrow();
});

test('T094 isolated settlement Then compares DB and GET expense source facts', async ({
  world,
}) => {
  await seedSplittingExpenses(world, [
    { 項目: '點心', 幣別: 'JPY', 金額: '100', 付款人: 'Alice', 分攤者: 'Alice、Amy、Bob' },
  ]);
  await captureCurrentAmyArrangement(world);
  await requestAmySettlement(world, '33');
  await runIsolatedStep(
    {
      phrase: preservedSettledExpensePhrase,
      input: undefined,
      execute: assertPreservedSettledExpense,
    },
    world,
  );
});
