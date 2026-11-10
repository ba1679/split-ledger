import { test, expect } from '../fixtures.js';
import { seedSplittingMembers } from './members-fixture.js';
import { recordSharedExpense } from './shared-expense-command.js';
import { runIsolatedStep } from './harness.js';
import {
  assertCreatedExpenseShares,
  assertExpenseShareResult,
  expectedExpenseShares,
  expenseShareResultPhrase,
} from './expense-share-result.js';
import type { SourceSnapshot } from './types.js';

test('T069 table mapping and exact oracle reject rounded, duplicated and zero persisted shares', () => {
  expect(expenseShareResultPhrase).toBe('該支出的分攤份額為：');
  const rows = ['Alice', 'Amy', 'Bob'].map((成員) => ({ 成員, 幣別: 'JPY', 份額: '100/3' }));
  const expected = expectedExpenseShares(rows, (name) => name, 'JPY');
  const ids = rows.map((row) => row.成員);
  const snapshot: SourceSnapshot = {
    trips: [],
    members: [],
    expenses: [{ id: 'e', amount_minor: '100', currency_code: 'JPY', minor_unit: 0 }],
    shares: ids.map((member_id) => ({ expense_id: 'e', member_id })),
    repayments: [],
    settlements: [],
    adjustments: [],
  };
  const view = {
    id: 'e',
    currencyCode: 'JPY',
    minorUnit: 0,
    shares: ids.map((memberId) => ({
      memberId,
      amount: { numerator: '100', denominator: '3', minorUnit: 0 },
    })),
  };
  expect(() => assertExpenseShareResult(view, snapshot, 'e', expected, ids)).not.toThrow();
  expect(() =>
    assertExpenseShareResult(
      {
        ...view,
        shares: view.shares.map((share, index) => ({
          ...share,
          amount: { numerator: index === 0 ? '34' : '33', denominator: '1', minorUnit: 0 },
        })),
      },
      snapshot,
      'e',
      expected,
      ids,
    ),
  ).toThrow();
  expect(() =>
    assertExpenseShareResult(
      { ...view, shares: [...view.shares, view.shares[0]] },
      snapshot,
      'e',
      expected,
      ids,
    ),
  ).toThrow();
  expect(() => expectedExpenseShares([...rows, rows[0]!], (name) => name, 'JPY')).toThrow();
  expect(() =>
    expectedExpenseShares([{ ...rows[0]!, 份額: '100/0' }], (name) => name, 'JPY'),
  ).toThrow();
  const excluded = expectedExpenseShares(
    [
      { 成員: 'Alice', 幣別: 'JPY', 份額: '0' },
      { 成員: 'Amy', 幣別: 'JPY', 份額: '100' },
    ],
    (name) => name,
    'JPY',
  );
  const single = { ...snapshot, shares: [{ expense_id: 'e', member_id: 'Amy' }] };
  const singleView = {
    ...view,
    shares: [{ memberId: 'Amy', amount: { numerator: '100', denominator: '1', minorUnit: 0 } }],
  };
  expect(() => assertExpenseShareResult(singleView, single, 'e', excluded, ['Amy'])).not.toThrow();
  expect(() => assertExpenseShareResult(singleView, snapshot, 'e', excluded, ['Amy'])).toThrow();
  const scaled = {
    ...snapshot,
    expenses: [{ ...snapshot.expenses[0], amount_minor: '10000', minor_unit: 2 }],
  };
  expect(() =>
    assertExpenseShareResult(
      {
        ...view,
        minorUnit: 2,
        shares: view.shares.map((share) => ({
          ...share,
          amount: { numerator: '10000', denominator: '3', minorUnit: 2 },
        })),
      },
      scaled,
      'e',
      expected,
      ids,
    ),
  ).not.toThrow();
});

test('T069 isolated create share Then', async ({ world }) => {
  await seedSplittingMembers(world);
  await recordSharedExpense(world, [
    { 項目: '點心', 幣別: 'JPY', 金額: '100', 付款人: 'Alice', 分攤者: 'Alice、Amy、Bob' },
  ]);
  await runIsolatedStep(
    {
      phrase: expenseShareResultPhrase,
      input: ['Alice', 'Amy', 'Bob'].map((成員) => ({ 成員, 幣別: 'JPY', 份額: '100/3' })),
      execute: assertCreatedExpenseShares,
    },
    world,
  );
});
