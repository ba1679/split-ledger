import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import {
  assertBrowserSettlementBalances,
  browserFixtureMemberNames,
  browserSplittingExpensesPhrase,
  browserSplittingStateKey,
  seedBrowserSplittingExpenses,
  type BrowserSplittingSnapshot,
} from './fixture.js';

const rows = [
  { 項目: '點心', 幣別: 'JPY', 金額: '100', 付款人: 'Alice', 分攤者: 'Alice、Amy、Bob' },
];

test('T106: DataTable establishes only named participants and rejects duplicate shares', () => {
  expect(browserFixtureMemberNames(rows)).toEqual(['Alice', 'Amy', 'Bob']);
  expect(browserFixtureMemberNames([{ ...rows[0]!, 付款人: 'David', 分攤者: 'Amy' }])).toEqual([
    'Alice',
    'Amy',
    'David',
  ]);
  expect(() => browserFixtureMemberNames([{ ...rows[0]!, 分攤者: 'Amy、Amy' }])).toThrow();
});

test('T106: isolated browser Given persists exact shares, defaults and authority snapshots without opening page', async ({
  page,
  world,
}) => {
  await runIsolatedStep(
    {
      phrase: browserSplittingExpensesPhrase,
      input: rows,
      execute: async (context, input) => seedBrowserSplittingExpenses(page, context, input),
    },
    world,
  );
  const initial = world.get<BrowserSplittingSnapshot>(browserSplittingStateKey);
  expect(page.url()).toBe('about:blank');
  expect(initial.expenses.items).toHaveLength(1);
  expect(initial.expenses.items[0]!.spentOn).toBe('2027-03-11');
  expect(initial.expenses.items[0]!.shares).toHaveLength(3);
  expect(initial.sources.members.map((row) => row.name).sort()).toEqual(['Alice', 'Amy', 'Bob']);
  for (const share of initial.expenses.items[0]!.shares)
    expect(share.amount).toEqual({ numerator: '100', denominator: '3', minorUnit: 0 });
  expect(initial.settlement.simplifyDebts).toBe(false);
  expect(initial.repayments.items).toEqual([]);
  expect((await page.context().cookies(world.get<string>('webOrigin'))).length).toBeGreaterThan(0);
});

test('T106: zero balances may retain a known currency after its final source is deleted', () => {
  const sources: BrowserSplittingSnapshot['sources'] = {
    trips: [],
    members: [{ id: 'alice' }],
    expenses: [],
    shares: [],
    repayments: [],
    settlements: [],
    adjustments: [],
  };
  const zero = {
    memberId: 'alice',
    currencyCode: 'JPY',
    netAmount: { numerator: '0', denominator: '1', minorUnit: 0 },
  };
  expect(() => assertBrowserSettlementBalances(sources, [zero])).not.toThrow();
  expect(() => assertBrowserSettlementBalances(sources, [])).not.toThrow();
  const invalid = [
    [zero, zero],
    [{ ...zero, memberId: 'unknown' }],
    [{ ...zero, currencyCode: 'ZZZ' }],
    [{ ...zero, netAmount: { ...zero.netAmount, numerator: '1' } }],
    [{ ...zero, netAmount: { ...zero.netAmount, denominator: '2' } }],
    [{ ...zero, netAmount: { ...zero.netAmount, numerator: '-0' } }],
    [{ ...zero, netAmount: { ...zero.netAmount, minorUnit: 5 } }],
  ];
  for (const balances of invalid)
    expect(() => assertBrowserSettlementBalances(sources, balances)).toThrow();
});

test('T106: sourced balances remain complete, reduced and independently checked', () => {
  const sources: BrowserSplittingSnapshot['sources'] = {
    trips: [],
    members: [{ id: 'alice' }, { id: 'amy' }],
    expenses: [
      {
        id: 'snack',
        currency_code: 'JPY',
        amount_minor: '100',
        minor_unit: 0,
        payer_member_id: 'alice',
      },
    ],
    shares: [
      { expense_id: 'snack', member_id: 'alice' },
      { expense_id: 'snack', member_id: 'amy' },
    ],
    repayments: [],
    settlements: [],
    adjustments: [],
  };
  const balances = [
    {
      memberId: 'alice',
      currencyCode: 'JPY',
      netAmount: { numerator: '50', denominator: '1', minorUnit: 0 },
    },
    {
      memberId: 'amy',
      currencyCode: 'JPY',
      netAmount: { numerator: '-50', denominator: '1', minorUnit: 0 },
    },
  ];
  expect(() => assertBrowserSettlementBalances(sources, balances)).not.toThrow();
  expect(() => assertBrowserSettlementBalances(sources, balances.slice(0, 1))).toThrow();
  expect(() =>
    assertBrowserSettlementBalances(sources, [
      { ...balances[0]!, netAmount: { numerator: '100', denominator: '2', minorUnit: 0 } },
      balances[1]!,
    ]),
  ).toThrow();
  expect(() =>
    assertBrowserSettlementBalances(sources, [
      { ...balances[0]!, netAmount: { numerator: '51', denominator: '1', minorUnit: 0 } },
      balances[1]!,
    ]),
  ).toThrow();
});
