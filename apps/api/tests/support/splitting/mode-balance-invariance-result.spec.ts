import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from './harness.js';
import { seedSplittingExpenses } from './expense-fixture.js';
import { changeSimplificationMode } from './change-simplification-command.js';
import {
  assertModeBalanceInvariance,
  assertModeBalancesUnchanged,
  modeBalanceInvariancePhrase,
} from './mode-balance-invariance-result.js';
import type { SourceSnapshot } from './types.js';

test('T090 exact mode-invariance rejects lost balances, source mutations and stale revisions', () => {
  expect(modeBalanceInvariancePhrase).toBe('簡化前後每位成員的精確淨額不變');
  const before: SourceSnapshot = {
    trips: [{ id: 'trip', simplify_debts: false, accounting_revision: '3', name: '旅行' }],
    members: [{ id: 'Alice' }, { id: 'Amy' }, { id: 'Bob' }, { id: 'Carol' }],
    expenses: [
      {
        id: 'expense',
        payer_member_id: 'Alice',
        amount_minor: '100',
        currency_code: 'JPY',
        minor_unit: 0,
      },
    ],
    shares: ['Alice', 'Amy', 'Bob'].map((member_id) => ({ expense_id: 'expense', member_id })),
    repayments: [],
    settlements: [],
    adjustments: [],
  };
  const after = {
    ...before,
    trips: [{ ...before.trips[0], simplify_debts: true, accounting_revision: '4' }],
  };
  const balances = [
    {
      memberId: 'Alice',
      currencyCode: 'JPY',
      netAmount: { numerator: '200', denominator: '3', minorUnit: 0 },
    },
    ...['Amy', 'Bob'].map((memberId) => ({
      memberId,
      currencyCode: 'JPY',
      netAmount: { numerator: '-100', denominator: '3', minorUnit: 0 },
    })),
  ];
  const view = { accountingRevision: '4', simplifyDebts: true, balances };
  expect(() => assertModeBalanceInvariance(before, after, view)).not.toThrow();
  const zero = {
    memberId: 'Carol',
    currencyCode: 'JPY',
    netAmount: { numerator: '0', denominator: '1', minorUnit: 0 },
  };
  expect(() =>
    assertModeBalanceInvariance(before, after, { ...view, balances: [...balances, zero] }),
  ).not.toThrow();
  for (const invalid of [
    { ...view, balances: balances.slice(0, 2) },
    { ...view, balances: [...balances, zero, zero] },
    { ...view, balances: [...balances, { ...zero, memberId: 'foreign' }] },
    { ...view, balances: [...balances, { ...zero, currencyCode: 'TWD' }] },
    {
      ...view,
      balances: balances.map((row) => ({
        ...row,
        netAmount: { numerator: '0', denominator: '1', minorUnit: 0 },
      })),
    },
    { ...view, accountingRevision: '3' },
    { ...view, simplifyDebts: false },
  ])
    expect(() => assertModeBalanceInvariance(before, after, invalid)).toThrow();
  for (const key of ['expenses', 'shares', 'members'] as const)
    expect(() => assertModeBalanceInvariance(before, { ...after, [key]: [] }, view)).toThrow();
  expect(() =>
    assertModeBalanceInvariance(
      before,
      { ...after, trips: [{ ...after.trips[0], name: 'Changed' }] },
      view,
    ),
  ).toThrow();
});

test('T090 isolated Then compares persisted mode with complete pre-PATCH exact DB balances', async ({
  world,
}) => {
  await seedSplittingExpenses(world, [
    { 項目: 'Alice車票', 幣別: 'JPY', 金額: '60', 付款人: 'Bob', 分攤者: 'Alice' },
    { 項目: 'Bob門票', 幣別: 'JPY', 金額: '60', 付款人: 'Carol', 分攤者: 'Bob' },
  ]);
  await changeSimplificationMode(world, '開啟');
  await runIsolatedStep(
    { phrase: modeBalanceInvariancePhrase, input: undefined, execute: assertModeBalancesUnchanged },
    world,
  );
});
