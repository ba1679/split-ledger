import { test, expect } from '../fixtures.js';
import { seedBrowserSplittingExpenses, type BrowserSplittingSnapshot } from './fixture.js';
import { viewBrowserSettlement } from './view-settlement.js';
import {
  arrangementsScreenPhrase,
  assertArrangementsScreen,
  assertScreenArrangementAuthority,
  type ScreenArrangementRow,
} from './arrangements-screen-result.js';

const rows: ScreenArrangementRow[] = ['Amy', 'Bob'].map((付款人) => ({
  付款人,
  收款人: 'Alice',
  幣別: 'JPY',
  金額: '100/3',
  顯示: 'JPY 33.33',
}));

test('T211 complete arrangement table rejects stale, reversed, extra and rounded amounts', () => {
  expect(arrangementsScreenPhrase).toBe('分帳畫面只列出以下付款安排：');
  const snapshot: BrowserSplittingSnapshot = {
    sources: {
      trips: [{ accounting_revision: '1', simplify_debts: false }],
      members: ['Alice', 'Amy', 'Bob'].map((id) => ({ id })),
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
    },
    settlement: {
      accountingRevision: '1',
      simplifyDebts: false,
      directArrangementCount: 2,
      suggestedArrangementCount: 2,
      balances: ['Alice', 'Amy', 'Bob'].map((memberId) => ({
        memberId,
        currencyCode: 'JPY',
        netAmount: {
          numerator: memberId === 'Alice' ? '200' : '-100',
          denominator: '3',
          minorUnit: 0,
        },
      })),
      arrangements: rows.map((row, i) => ({
        key: `opaque-${i}`,
        debtorMemberId: row.付款人,
        creditorMemberId: row.收款人,
        currencyCode: row.幣別,
        amount: { numerator: '100', denominator: '3', minorUnit: 0 },
      })),
    } as BrowserSplittingSnapshot['settlement'],
    expenses: { items: [], totalCount: 1, nextCursor: null },
    repayments: { items: [] },
    totals: { totals: [] },
  };
  const check = (value = snapshot, table = rows) =>
    assertScreenArrangementAuthority(value, table, (name) => name);
  expect(() => check()).not.toThrow();
  expect(() => check(snapshot, rows.slice(1))).toThrow();
  expect(() => check(snapshot, [...rows, rows[0]!])).toThrow();
  for (const mutate of [
    (value: BrowserSplittingSnapshot) => {
      value.settlement.accountingRevision = '0';
    },
    (value: BrowserSplittingSnapshot) => {
      value.settlement.arrangements[0]!.amount = {
        numerator: '3333',
        denominator: '100',
        minorUnit: 0,
      };
    },
    (value: BrowserSplittingSnapshot) => {
      value.settlement.arrangements[0]!.creditorMemberId = 'Amy';
    },
    (value: BrowserSplittingSnapshot) => {
      value.settlement.arrangements[0]!.currencyCode = 'TWD';
    },
    (value: BrowserSplittingSnapshot) => {
      value.settlement.arrangements[1]!.key = value.settlement.arrangements[0]!.key;
    },
  ]) {
    const changed = structuredClone(snapshot);
    mutate(changed);
    expect(() => check(changed)).toThrow();
  }
  expect(() =>
    check(
      snapshot,
      rows.map((row) => ({ ...row, 顯示: 'JPY 33.34' })),
    ),
  ).toThrow();
});

test('T211 real product complete arrangement screen', async ({ page, world }) => {
  await seedBrowserSplittingExpenses(page, world, [
    { 項目: '點心', 幣別: 'JPY', 金額: '100', 付款人: 'Alice', 分攤者: 'Alice、Amy、Bob' },
  ]);
  await viewBrowserSettlement(page, world);
  await assertArrangementsScreen(page, world, rows);
});
