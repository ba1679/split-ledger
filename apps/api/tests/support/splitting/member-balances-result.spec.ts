import { test, expect } from '../fixtures.js';
import { seedSplittingExpenses } from './expense-fixture.js';
import { readTripSettlement } from './read-settlement-command.js';
import { runIsolatedStep } from './harness.js';
import {
  assertMemberBalances,
  assertMemberBalanceProjection,
  memberBalancesResultPhrase,
  tableBalance,
} from './member-balances-result.js';
import type { SourceSnapshot } from './types.js';

const table = [
  { 成員: 'Alice', 幣別: 'JPY', 淨額: '200/3' },
  { 成員: 'Amy', 幣別: 'JPY', 淨額: '-100/3' },
  { 成員: 'Bob', 幣別: 'JPY', 淨額: '-100/3' },
];

test('T085 exact signed table balances reject omissions, rounding, foreign and duplicate rows', () => {
  expect(memberBalancesResultPhrase).toBe('成員的分幣別精確淨額如下：');
  const snapshot: SourceSnapshot = {
    trips: [{ accounting_revision: '1' }],
    members: ['Alice', 'Amy', 'Bob', 'Carol'].map((id) => ({ id })),
    expenses: [
      {
        id: 'e',
        currency_code: 'JPY',
        amount_minor: '100',
        minor_unit: 0,
        payer_member_id: 'Alice',
      },
    ],
    shares: ['Alice', 'Amy', 'Bob'].map((member_id) => ({ expense_id: 'e', member_id })),
    repayments: [],
    settlements: [],
    adjustments: [],
  };
  const view = {
    accountingRevision: '1',
    balances: table.map((row) => ({
      memberId: row.成員,
      currencyCode: row.幣別,
      netAmount: tableBalance(row.淨額),
    })),
  };
  const assert = (value = view, rows = table) =>
    assertMemberBalanceProjection(snapshot, value, rows, (name) => name);
  expect(() => assert()).not.toThrow();
  expect(() =>
    assert({
      ...view,
      balances: [
        ...view.balances,
        { memberId: 'Carol', currencyCode: 'JPY', netAmount: tableBalance('0') },
      ],
    }),
  ).not.toThrow();
  expect(() => assert({ ...view, balances: view.balances.slice(1) })).toThrow();
  expect(() => assert(view, table.slice(1))).toThrow();
  expect(() => assert({ ...view, balances: [...view.balances, view.balances[0]!] })).toThrow();
  expect(() =>
    assert({
      ...view,
      balances: [...view.balances, { ...view.balances[0]!, memberId: 'outsider' }],
    }),
  ).toThrow();
  expect(() => assert({ ...view, accountingRevision: '0' })).toThrow();
  expect(() =>
    assert({
      ...view,
      balances: view.balances.map((row) => ({
        ...row,
        netAmount: tableBalance(row.memberId === 'Alice' ? '66.67' : '-33.33'),
      })),
    }),
  ).toThrow();
  const scaled = {
    ...view,
    balances: view.balances.map((row) => ({
      ...row,
      netAmount: {
        ...row.netAmount,
        numerator: (BigInt(row.netAmount.numerator) * 100n).toString(),
        minorUnit: 2,
      },
    })),
  };
  expect(() => assert(scaled)).not.toThrow();
  expect(tableBalance('-0.25')).toEqual({ numerator: '-25', denominator: '100', minorUnit: 0 });
  expect(() => tableBalance('1/0')).toThrow();
});

test('T085 isolated multi-currency member balance Then', async ({ world }) => {
  await seedSplittingExpenses(world, [
    { 項目: '車票', 幣別: 'JPY', 金額: '600', 付款人: 'Alice', 分攤者: 'Amy' },
    { 項目: '機票', 幣別: 'TWD', 金額: '900', 付款人: 'Amy', 分攤者: 'Alice' },
  ]);
  await readTripSettlement(world);
  await runIsolatedStep(
    {
      phrase: memberBalancesResultPhrase,
      input: [
        { 成員: 'Alice', 幣別: 'JPY', 淨額: '600' },
        { 成員: 'Amy', 幣別: 'JPY', 淨額: '-600' },
        { 成員: 'Alice', 幣別: 'TWD', 淨額: '-900' },
        { 成員: 'Amy', 幣別: 'TWD', 淨額: '900' },
      ],
      execute: assertMemberBalances,
    },
    world,
  );
});
