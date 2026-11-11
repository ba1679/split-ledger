import { test, expect } from '../fixtures.js';
import { seedBrowserSplittingExpenses, type BrowserSplittingSnapshot } from './fixture.js';
import { viewBrowserSettlement } from './view-settlement.js';
import {
  assertMemberBalancesScreen,
  assertScreenBalanceAuthority,
  expectedBalanceDisplay,
  memberBalancesScreenPhrase,
  type ScreenMemberBalanceRow,
} from './member-balances-screen-result.js';

const rows: ScreenMemberBalanceRow[] = [
  { 成員: 'Alice', 幣別: 'JPY', 淨額: '200/3', 顯示: 'JPY 66.67' },
  { 成員: 'Amy', 幣別: 'JPY', 淨額: '-100/3', 顯示: 'JPY -33.33' },
  { 成員: 'Bob', 幣別: 'JPY', 淨額: '-100/3', 顯示: 'JPY -33.33' },
];

test('T110 independent balance authority preserves rational zero sum despite rounded display', () => {
  expect(memberBalancesScreenPhrase).toBe('分帳畫面顯示以下成員淨額：');
  const snapshot: BrowserSplittingSnapshot = {
    sources: {
      trips: [{ accounting_revision: '1' }],
      members: ['Alice', 'Amy', 'Bob'].map((id) => ({ id })),
      expenses: [
        {
          id: 'snack',
          currency_code: 'JPY',
          amount_minor: '100',
          minor_unit: 0,
          payer_member_id: 'Alice',
        },
      ],
      shares: ['Alice', 'Amy', 'Bob'].map((member_id) => ({ expense_id: 'snack', member_id })),
      repayments: [],
      settlements: [],
      adjustments: [],
    },
    settlement: {
      accountingRevision: '1',
      simplifyDebts: false,
      arrangements: [],
      balances: rows.map((row) => ({
        memberId: row.成員,
        currencyCode: 'JPY',
        netAmount: {
          numerator: row.成員 === 'Alice' ? '200' : '-100',
          denominator: '3',
          minorUnit: 0,
        },
      })),
    },
    expenses: { items: [], totalCount: 1, nextCursor: null },
    repayments: { items: [] },
    totals: { totals: [] },
  };
  const check = (table = rows, value = snapshot) =>
    assertScreenBalanceAuthority(value, table, (name) => name);
  expect(() => check()).not.toThrow();
  expect(() => check(rows.slice(1))).toThrow();
  expect(() => check([...rows, rows[0]!])).toThrow();
  expect(() =>
    check(rows.map((row) => ({ ...row, 顯示: row.顯示.replace('66.67', '66.66') }))),
  ).toThrow();
  expect(() =>
    check(rows.map((row) => ({ ...row, 淨額: row.淨額.replace('200/3', '66.67') }))),
  ).toThrow();
  const missing = structuredClone(snapshot);
  missing.settlement.balances.shift();
  expect(() => check(rows, missing)).toThrow();
  expect(expectedBalanceDisplay('JPY', { numerator: '-1', denominator: '200', minorUnit: 0 })).toBe(
    'JPY -0.01',
  );
  expect(
    expectedBalanceDisplay('TWD', { numerator: '10000', denominator: '2', minorUnit: 2 }),
  ).toBe('TWD 50');
  const zero = structuredClone(snapshot);
  zero.sources = { ...zero.sources, expenses: [], shares: [] };
  zero.settlement.balances = [];
  expect(() =>
    check(
      rows.map((row) => ({ ...row, 淨額: '0', 顯示: 'JPY 0' })),
      zero,
    ),
  ).not.toThrow();
});

test('T110 isolated real product balances Then', async ({ page, world }) => {
  await seedBrowserSplittingExpenses(page, world, [
    { 項目: '點心', 幣別: 'JPY', 金額: '100', 付款人: 'Alice', 分攤者: 'Alice、Amy、Bob' },
  ]);
  await viewBrowserSettlement(page, world);
  await assertMemberBalancesScreen(page, world, rows);
});
