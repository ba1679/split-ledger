import { test, expect } from '../fixtures.js';
import {
  assertExactArrangementSet,
  directExpenseArrangements,
  assertExpenseArrangements,
  expenseArrangementsPhrase,
} from './expense-arrangements-result.js';
import type { SourceSnapshot } from './types.js';
import { seedSplittingExpenses } from './expense-fixture.js';
import { replaceDinnerSharing } from './replace-dinner-sharing-command.js';
import { runIsolatedStep } from './harness.js';

const sources = (): SourceSnapshot => ({
  trips: [],
  members: [],
  expenses: [
    { id: 'e', payer_member_id: 'Alice', amount_minor: '200', minor_unit: 0, currency_code: 'JPY' },
  ],
  shares: [
    { expense_id: 'e', member_id: 'Amy' },
    { expense_id: 'e', member_id: 'Bob' },
  ],
  repayments: [],
  settlements: [],
  adjustments: [],
});
test('T070 full arrangement set checks exact scale, duplicate, reversed, stale and cross-currency results', () => {
  expect(expenseArrangementsPhrase).toBe('該旅行的付款安排為：');
  const expected = directExpenseArrangements(sources());
  expect(expected).toHaveLength(2);
  expect(() =>
    assertExactArrangementSet(
      expected.map((row) => ({
        ...row,
        amount: { numerator: '10000', denominator: '1', minorUnit: 2 },
      })),
      expected,
    ),
  ).not.toThrow();
  for (const invalid of [
    expected.slice(1),
    [...expected, expected[0]!],
    expected.map((row) => ({ ...row, currencyCode: 'TWD' })),
    expected.map((row) => ({
      ...row,
      debtorMemberId: row.creditorMemberId,
      creditorMemberId: row.debtorMemberId,
    })),
    expected.map((row) => ({
      ...row,
      amount: { numerator: '99', denominator: '1', minorUnit: 0 },
    })),
  ])
    expect(() => assertExactArrangementSet(invalid, expected)).toThrow();
});
test('T070 oracle rebuilds reciprocal debt, payment reversal and signed adjustment exactly', () => {
  const baseline = sources();
  const snapshot: SourceSnapshot = {
    ...baseline,
    repayments: [
      {
        payer_member_id: 'Amy',
        payee_member_id: 'Alice',
        currency_code: 'JPY',
        amount_minor: '125',
        minor_unit: 0,
      },
    ],
    settlements: [{ id: 's', debtor_member_id: 'Bob', creditor_member_id: 'Alice' }],
    adjustments: [
      {
        settlement_id: 's',
        member_id: 'Bob',
        currency_code: 'JPY',
        numerator: '1',
        denominator: '3',
        minor_unit: 0,
      },
      {
        settlement_id: 's',
        member_id: 'Alice',
        currency_code: 'JPY',
        numerator: '-1',
        denominator: '3',
        minor_unit: 0,
      },
    ],
  };
  assertExactArrangementSet(directExpenseArrangements(snapshot), [
    {
      debtorMemberId: 'Alice',
      creditorMemberId: 'Amy',
      currencyCode: 'JPY',
      amount: { numerator: '25', denominator: '1', minorUnit: 0 },
    },
    {
      debtorMemberId: 'Bob',
      creditorMemberId: 'Alice',
      currencyCode: 'JPY',
      amount: { numerator: '299', denominator: '3', minorUnit: 0 },
    },
  ]);
  expect(() =>
    directExpenseArrangements({
      ...snapshot,
      shares: [...snapshot.shares, { expense_id: 'deleted', member_id: 'Amy' }],
    }),
  ).toThrow();
});
test('T070 isolated arrangement Then checks real sources and GET after sharing correction', async ({
  world,
}) => {
  await seedSplittingExpenses(world, [
    { 項目: '晚餐', 幣別: 'JPY', 金額: '300', 付款人: 'Alice', 分攤者: 'Alice、Amy、Bob' },
  ]);
  await replaceDinnerSharing(world);
  await runIsolatedStep(
    {
      phrase: expenseArrangementsPhrase,
      input: [{ 付款人: 'Bob', 收款人: 'Amy', 幣別: 'JPY', 金額: '100' }],
      execute: assertExpenseArrangements,
    },
    world,
  );
});
