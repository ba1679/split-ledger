import { test, expect } from '../fixtures.js';
import * as sharedProduct from '@split-ledger/shared';
import type { CalculateSplitting, PaymentArrangement, SplittingInput } from '@split-ledger/shared';
import {
  assertSimplificationCount,
  assertSimplificationCountProjection,
  independentNetCandidate,
  simplificationCountPhrase,
  type CountSettlementView,
} from './simplification-count-result.js';
import {
  directExpenseArrangements,
  assertExactArrangementSet,
} from './expense-arrangements-result.js';
import { snapshotExactBalances } from './simplification-mode-fixture.js';
import { seedSplittingExpenses } from './expense-fixture.js';
import { changeSimplificationMode } from './change-simplification-command.js';
import { runIsolatedStep } from './harness.js';
import type { SourceSnapshot } from './types.js';

function sources(edges: [string, string, string][]): SourceSnapshot {
  return {
    trips: [{ accounting_revision: '7', simplify_debts: true }],
    members: [...new Set(edges.flatMap(([from, to]) => [from, to]))].map((id) => ({ id })),
    expenses: edges.map(([, to, sum], i) => ({
      id: `e${i}`,
      payer_member_id: to,
      currency_code: 'JPY',
      amount_minor: sum,
      minor_unit: 0,
    })),
    shares: edges.map(([from], i) => ({ expense_id: `e${i}`, member_id: from })),
    repayments: [],
    settlements: [],
    adjustments: [],
  };
}

function projection(snapshot: SourceSnapshot, simplified: boolean): CountSettlementView {
  const direct = directExpenseArrangements(snapshot),
    candidate = independentNetCandidate(snapshot);
  const selected = simplified && candidate.length <= direct.length ? candidate : direct;

  return {
    accountingRevision: '7',
    simplifyDebts: simplified,
    directArrangementCount: direct.length,
    suggestedArrangementCount: selected.length,
    arrangements: selected.map((row, i) => ({ ...row, key: `key${i}` })),
    balances: snapshotExactBalances(snapshot)
      .filter((row) => BigInt(row.amount.numerator) !== 0n)
      .map(({ amount, ...row }) => ({ ...row, netAmount: amount })),
  };
}

test('T091 source oracle verifies chain reduction and rejects lying counts or missing balances', () => {
  expect(simplificationCountPhrase).toBe('簡化建議的付款筆數不多於直接安排');
  const snapshot = sources([
    ['Alice', 'Bob', '60'],
    ['Bob', 'Carol', '60'],
  ]);
  const view = projection(snapshot, true);
  expect(view.arrangements).toHaveLength(1);
  expect(view.arrangements[0]).toMatchObject({
    debtorMemberId: 'Alice',
    creditorMemberId: 'Carol',
  });
  expect(() => assertSimplificationCountProjection(snapshot, view)).not.toThrow();
  for (const bad of [
    { ...view, directArrangementCount: 99 },
    { ...view, suggestedArrangementCount: 0 },
    { ...view, arrangements: [] },
    { ...view, balances: view.balances.slice(1) },
    { ...view, accountingRevision: '6' },
  ])
    expect(() => assertSimplificationCountProjection(snapshot, bad)).toThrow();
});
test('T091 greedy four-edge candidate must fall back to the three-edge direct graph', () => {
  const snapshot = sources([
    ['A', 'C', '8'],
    ['A', 'D', '7'],
    ['B', 'E', '9'],
  ]);
  expect(independentNetCandidate(snapshot)).toHaveLength(4);
  const view = projection(snapshot, true);
  expect(view.arrangements).toHaveLength(3);
  expect(() => assertSimplificationCountProjection(snapshot, view)).not.toThrow();
  const candidate = independentNetCandidate(snapshot).map((row, i) => ({
    ...row,
    key: `candidate${i}`,
  }));
  expect(() =>
    assertSimplificationCountProjection(snapshot, { ...view, arrangements: candidate }),
  ).toThrow();
  expect(() =>
    assertSimplificationCountProjection(snapshot, {
      ...view,
      suggestedArrangementCount: 4,
      arrangements: candidate,
    }),
  ).toThrow();
});
test('T091 deterministic ties use stable IDs and retain rational amounts across currencies', () => {
  const snapshot = sources([
    ['B', 'D', '1'],
    ['A', 'C', '1'],
  ]);
  const withFractions: SourceSnapshot = {
    ...snapshot,
    expenses: snapshot.expenses.map((row, i) => ({
      ...row,
      currency_code: i ? 'TWD' : 'JPY',
      minor_unit: i ? 2 : 0,
    })),
    shares: [
      ...snapshot.shares,
      { expense_id: 'e0', member_id: 'C' },
      { expense_id: 'e0', member_id: 'A' },
    ],
  };
  const candidate = independentNetCandidate(withFractions);
  expect(candidate.some((row) => row.amount.denominator === '3')).toBe(true);
  expect(
    candidate.some((row) => row.currencyCode === 'TWD' && row.amount.denominator === '100'),
  ).toBe(true);
  const tied = independentNetCandidate(snapshot);
  expect(tied.map((row) => [row.debtorMemberId, row.creditorMemberId])).toEqual([
    ['A', 'C'],
    ['B', 'D'],
  ]);
  const disabled: SourceSnapshot = {
    ...snapshot,
    trips: [{ accounting_revision: '7', simplify_debts: false }],
  };
  expect(() =>
    assertSimplificationCountProjection(disabled, projection(disabled, false)),
  ).not.toThrow();
});
test('T091 isolated Then reads the real settlement projection without writes', async ({
  world,
}) => {
  await seedSplittingExpenses(world, [
    { 項目: 'Alice車票', 幣別: 'JPY', 金額: '60', 付款人: 'Bob', 分攤者: 'Alice' },
    { 項目: 'Bob門票', 幣別: 'JPY', 金額: '60', 付款人: 'Carol', 分攤者: 'Bob' },
  ]);
  await changeSimplificationMode(world, '開啟');
  await runIsolatedStep(
    { phrase: simplificationCountPhrase, input: undefined, execute: assertSimplificationCount },
    world,
  );
});

test('T091 product calculator falls back when greedy pairing would increase the payment count', () => {
  const calculator = (sharedProduct as unknown as { calculateSplitting?: CalculateSplitting })
    .calculateSplitting;
  expect(
    typeof calculator,
    'Product must export calculateSplitting to enforce the fallback guarantee',
  ).toBe('function');
  const input: SplittingInput = {
    members: ['A', 'B', 'C', 'D', 'E'].map((id) => ({
      id,
      name: id,
      isOwner: id === 'A',
      isActive: true,
    })),
    expenses: [
      {
        id: 'ac',
        payerMemberId: 'C',
        shareMemberIds: ['A'],
        amountMinor: 8n,
        currencyCode: 'JPY',
        minorUnit: 0,
      },
      {
        id: 'ad',
        payerMemberId: 'D',
        shareMemberIds: ['A'],
        amountMinor: 7n,
        currencyCode: 'JPY',
        minorUnit: 0,
      },
      {
        id: 'be',
        payerMemberId: 'E',
        shareMemberIds: ['B'],
        amountMinor: 9n,
        currencyCode: 'JPY',
        minorUnit: 0,
      },
    ],
    repayments: [],
    adjustments: [],
  };
  const expected = [
    {
      debtorMemberId: 'A',
      creditorMemberId: 'C',
      currencyCode: 'JPY',
      amount: { numerator: '8', denominator: '1', minorUnit: 0 },
    },
    {
      debtorMemberId: 'A',
      creditorMemberId: 'D',
      currencyCode: 'JPY',
      amount: { numerator: '7', denominator: '1', minorUnit: 0 },
    },
    {
      debtorMemberId: 'B',
      creditorMemberId: 'E',
      currencyCode: 'JPY',
      amount: { numerator: '9', denominator: '1', minorUnit: 0 },
    },
  ];
  const convert = (rows: readonly PaymentArrangement[]) =>
    rows.map((row) => ({
      debtorMemberId: row.fromMemberId,
      creditorMemberId: row.toMemberId,
      currencyCode: row.currencyCode,
      amount: {
        numerator: row.amount.numerator.toString(),
        denominator: row.amount.denominator.toString(),
        minorUnit: row.minorUnit,
      },
    }));
  const result = calculator!(input);
  assertExactArrangementSet(convert(result.directArrangements), expected);
  assertExactArrangementSet(convert(result.simplifiedArrangements), expected);
});
