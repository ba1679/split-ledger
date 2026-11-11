import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from './harness.js';
import { seedSplittingExpenses } from './expense-fixture.js';
import { readTripSettlement } from './read-settlement-command.js';
import {
  assertCurrencyZeroSums,
  assertSettlementZeroSums,
  zeroSumPhrase,
} from './zero-sum-result.js';
import type { SourceSnapshot } from './types.js';

const snapshot: SourceSnapshot = {
  trips: [{ accounting_revision: '0' }],
  members: [{ id: 'Alice' }, { id: 'Amy' }, { id: 'Bob' }, { id: 'Carol' }],
  expenses: [
    {
      id: 'snack',
      payer_member_id: 'Alice',
      currency_code: 'JPY',
      amount_minor: '100',
      minor_unit: 0,
    },
  ],
  shares: ['Alice', 'Amy', 'Bob'].map((member_id) => ({ expense_id: 'snack', member_id })),
  repayments: [],
  settlements: [],
  adjustments: [],
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

test('T083 literal signature and exact oracle accept optional zero rows', () => {
  expect(zeroSumPhrase).toBe('各幣別淨額精確總和為零');
  expect(zeroSumPhrase).not.toContain('{');
  expect(() => assertCurrencyZeroSums(snapshot, balances)).not.toThrow();
  const zero = {
    memberId: 'Carol',
    currencyCode: 'JPY',
    netAmount: { numerator: '0', denominator: '1', minorUnit: 0 },
  };
  expect(() => assertCurrencyZeroSums(snapshot, [...balances, zero])).not.toThrow();
  expect(() => assertCurrencyZeroSums(snapshot, [])).toThrow();
  expect(() => assertCurrencyZeroSums(snapshot, balances.slice(0, 2))).toThrow();
  expect(() => assertCurrencyZeroSums(snapshot, [...balances, zero, zero])).toThrow();
  expect(() =>
    assertCurrencyZeroSums(snapshot, [...balances, { ...zero, memberId: 'foreign' }]),
  ).toThrow();
  expect(() =>
    assertCurrencyZeroSums(snapshot, [...balances, { ...zero, currencyCode: 'TWD' }]),
  ).toThrow();
  expect(() =>
    assertCurrencyZeroSums(snapshot, [
      ...balances,
      { ...zero, netAmount: { ...zero.netAmount, denominator: '2' } },
    ]),
  ).toThrow();
  expect(() =>
    assertCurrencyZeroSums(
      snapshot,
      balances.map((row) => ({
        ...row,
        netAmount: { numerator: '0', denominator: '1', minorUnit: 0 },
      })),
    ),
  ).toThrow();
  expect(() =>
    assertCurrencyZeroSums(
      snapshot,
      balances.map((row) => ({ ...row, netAmount: { ...row.netAmount, denominator: '-3' } })),
    ),
  ).toThrow();
});

test('T083 mixed historical scales remain exact and currencies cannot cancel each other', () => {
  const sources: SourceSnapshot = {
    ...snapshot,
    expenses: [
      {
        id: 'old',
        payer_member_id: 'Alice',
        currency_code: 'TWD',
        amount_minor: '123',
        minor_unit: 2,
      },
      {
        id: 'new',
        payer_member_id: 'Alice',
        currency_code: 'TWD',
        amount_minor: '1',
        minor_unit: 0,
      },
      { id: 'yen', payer_member_id: 'Amy', currency_code: 'JPY', amount_minor: '1', minor_unit: 0 },
    ],
    shares: [
      { expense_id: 'old', member_id: 'Amy' },
      { expense_id: 'new', member_id: 'Amy' },
      { expense_id: 'yen', member_id: 'Alice' },
    ],
  };
  const rows = [
    {
      memberId: 'Alice',
      currencyCode: 'TWD',
      netAmount: { numerator: '223', denominator: '1', minorUnit: 2 },
    },
    {
      memberId: 'Amy',
      currencyCode: 'TWD',
      netAmount: { numerator: '-223', denominator: '1', minorUnit: 2 },
    },
    {
      memberId: 'Alice',
      currencyCode: 'JPY',
      netAmount: { numerator: '-1', denominator: '1', minorUnit: 0 },
    },
    {
      memberId: 'Amy',
      currencyCode: 'JPY',
      netAmount: { numerator: '1', denominator: '1', minorUnit: 0 },
    },
  ];
  expect(() => assertCurrencyZeroSums(sources, rows)).not.toThrow();
  expect(() => assertCurrencyZeroSums(sources, [rows[0]!, rows[2]!])).toThrow();
});

test('T083 isolated Then verifies source-backed per-currency zero sums and repeated revision', async ({
  world,
}) => {
  await seedSplittingExpenses(world, [
    { 項目: '車票', 幣別: 'JPY', 金額: '600', 付款人: 'Alice', 分攤者: 'Amy' },
    { 項目: '機票', 幣別: 'TWD', 金額: '900', 付款人: 'Amy', 分攤者: 'Alice' },
  ]);
  await readTripSettlement(world);
  await runIsolatedStep(
    { phrase: zeroSumPhrase, input: undefined, execute: assertSettlementZeroSums },
    world,
  );
});
