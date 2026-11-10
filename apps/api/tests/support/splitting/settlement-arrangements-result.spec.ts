import { test, expect } from '../fixtures.js';
import {
  assertSettlementArrangementProjection,
  assertSettlementArrangements,
  settlementArrangementsPhrase,
  settlementTableAmount,
} from './settlement-arrangements-result.js';
import { directExpenseArrangements } from './expense-arrangements-result.js';
import {
  independentNetCandidate,
  type CountSettlementView,
} from './simplification-count-result.js';
import { snapshotExactBalances } from './simplification-mode-fixture.js';
import { seedSplittingExpenses } from './expense-fixture.js';
import { readTripSettlement } from './read-settlement-command.js';
import { runIsolatedStep } from './harness.js';
import type { SourceSnapshot } from './types.js';

const source: SourceSnapshot = {
  trips: [{ accounting_revision: '9', simplify_debts: false }],
  members: ['Alice', 'Bob', 'Carol'].map((id) => ({ id })),
  expenses: [
    { id: 'ab', payer_member_id: 'Bob', currency_code: 'JPY', amount_minor: '60', minor_unit: 0 },
    { id: 'bc', payer_member_id: 'Carol', currency_code: 'JPY', amount_minor: '60', minor_unit: 0 },
  ],
  shares: [
    { expense_id: 'ab', member_id: 'Alice' },
    { expense_id: 'bc', member_id: 'Bob' },
  ],
  repayments: [],
  settlements: [],
  adjustments: [],
};

function projection(snapshot: SourceSnapshot): CountSettlementView {
  const direct = directExpenseArrangements(snapshot),
    candidate = independentNetCandidate(snapshot);
  const chosen =
    snapshot.trips[0]!.simplify_debts && candidate.length <= direct.length ? candidate : direct;

  return {
    accountingRevision: '9',
    simplifyDebts: Boolean(snapshot.trips[0]!.simplify_debts),
    directArrangementCount: direct.length,
    suggestedArrangementCount: chosen.length,
    arrangements: chosen.map((row, i) => ({ ...row, key: `opaque-${i}` })),
    balances: snapshotExactBalances(snapshot).map(({ amount, ...row }) => ({
      ...row,
      netAmount: amount,
    })),
  };
}

test('T097 exact table preserves direct mode and switches oracle to simplified mode without writes', () => {
  expect(settlementArrangementsPhrase).toBe('結算付款安排如下：');
  expect(settlementTableAmount('100/3')).toEqual({
    numerator: '100',
    denominator: '3',
    minorUnit: 0,
  });
  expect(settlementTableAmount('1.25')).toEqual({
    numerator: '125',
    denominator: '100',
    minorUnit: 0,
  });
  for (const bad of ['0', '-1', '1/0', 'NaN']) expect(() => settlementTableAmount(bad)).toThrow();
  const direct = directExpenseArrangements(source),
    view = projection(source);
  expect(() => assertSettlementArrangementProjection(source, view, direct)).not.toThrow();
  const simplified: SourceSnapshot = {
    ...source,
    trips: [{ accounting_revision: '9', simplify_debts: true }],
  };
  const candidate = independentNetCandidate(simplified);
  expect(candidate).toHaveLength(1);
  expect(() =>
    assertSettlementArrangementProjection(simplified, projection(simplified), candidate),
  ).not.toThrow();
  for (const bad of [
    { ...view, arrangements: view.arrangements.slice(1) },
    { ...view, arrangements: [...view.arrangements, view.arrangements[0]!] },
    { ...view, arrangements: view.arrangements.map((row) => ({ ...row, key: '' })) },
    { ...view, arrangements: view.arrangements.map((row) => ({ ...row, key: 'duplicate' })) },
    { ...view, accountingRevision: '8' },
    { ...view, simplifyDebts: true },
    { ...view, suggestedArrangementCount: 1 },
  ])
    expect(() => assertSettlementArrangementProjection(source, bad, direct)).toThrow();
  expect(() =>
    assertSettlementArrangementProjection(simplified, projection(simplified), direct),
  ).toThrow();
});
test('T097 isolated Then verifies the real direct settlement arrangement table', async ({
  world,
}) => {
  await seedSplittingExpenses(world, [
    { 項目: 'Alice車票', 幣別: 'JPY', 金額: '60', 付款人: 'Bob', 分攤者: 'Alice' },
    { 項目: 'Bob門票', 幣別: 'JPY', 金額: '60', 付款人: 'Carol', 分攤者: 'Bob' },
  ]);
  await readTripSettlement(world);
  await runIsolatedStep(
    {
      phrase: settlementArrangementsPhrase,
      input: [
        { 付款人: 'Alice', 收款人: 'Bob', 幣別: 'JPY', 金額: '60' },
        { 付款人: 'Bob', 收款人: 'Carol', 幣別: 'JPY', 金額: '60' },
      ],
      execute: assertSettlementArrangements,
    },
    world,
  );
});
