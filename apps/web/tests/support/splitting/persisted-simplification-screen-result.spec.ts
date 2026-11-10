import { test, expect } from '../fixtures.js';
import { seedBrowserSplittingExpenses, type BrowserSplittingSnapshot } from './fixture.js';
import {
  saveEnabledSimplification,
  type SavedSimplification,
} from './saved-simplification-fixture.js';
import type { ConfirmedSettlementScreen } from './settlement-screen.js';
import { viewBrowserSettlement } from './view-settlement.js';
import {
  assertPersistedSimplificationAuthority,
  assertPersistedSimplificationScreen,
} from './persisted-simplification-screen-result.js';

test('T217 persisted mode rejects reset mode, stale revision, changed keys, balances or sources', () => {
  const snapshot: BrowserSplittingSnapshot = {
    sources: {
      trips: [{ id: 'trip', accounting_revision: '7', simplify_debts: true }],
      members: [],
      expenses: [],
      shares: [],
      repayments: [],
      settlements: [],
      adjustments: [],
    },
    settlement: {
      simplifyDebts: true,
      accountingRevision: '7',
      balances: [
        {
          memberId: 'Alice',
          currencyCode: 'JPY',
          netAmount: { numerator: '-60', denominator: '1', minorUnit: 0 },
        },
      ],
      arrangements: [
        {
          key: 'saved-key',
          debtorMemberId: 'Alice',
          creditorMemberId: 'Carol',
          currencyCode: 'JPY',
          amount: { numerator: '60', denominator: '1', minorUnit: 0 },
        },
      ],
    },
    expenses: { items: [], totalCount: 0, nextCursor: null },
    repayments: { items: [] },
    totals: { totals: [] },
  };
  const trip = { id: 'trip', accountingRevision: '7', simplifyDebts: true };
  const saved: SavedSimplification = { trip, snapshot };
  const screen: ConfirmedSettlementScreen = { trip, snapshot, text: '', arrangementLinks: [] };
  assertPersistedSimplificationAuthority(saved, screen, trip, snapshot);
  expect(() =>
    assertPersistedSimplificationAuthority(
      saved,
      screen,
      { ...trip, simplifyDebts: false },
      snapshot,
    ),
  ).toThrow();
  expect(() =>
    assertPersistedSimplificationAuthority(
      saved,
      { ...screen, trip: { ...trip, accountingRevision: '6' } },
      trip,
      snapshot,
    ),
  ).toThrow();
  for (const mutate of [
    (value: BrowserSplittingSnapshot) => {
      value.settlement.simplifyDebts = false;
    },
    (value: BrowserSplittingSnapshot) => {
      value.settlement.accountingRevision = '8';
    },
    (value: BrowserSplittingSnapshot) => {
      value.settlement.arrangements[0]!.key = 'fresh-key';
    },
    (value: BrowserSplittingSnapshot) => {
      value.settlement.balances[0]!.netAmount = {
        numerator: '-59',
        denominator: '1',
        minorUnit: 0,
      };
    },
    (value: BrowserSplittingSnapshot) => {
      value.sources = { ...value.sources, adjustments: [{ id: 'unexpected' }] };
    },
  ]) {
    const changed = structuredClone(snapshot);
    mutate(changed);
    expect(() => assertPersistedSimplificationAuthority(saved, screen, trip, changed)).toThrow();
  }
});

test('T217 reopening real persisted mode reproduces Alice to Carol sixty without writes', async ({
  page,
  world,
}) => {
  await seedBrowserSplittingExpenses(page, world, [
    { 項目: '車票', 幣別: 'JPY', 金額: '60', 付款人: 'Bob', 分攤者: 'Alice' },
    { 項目: '門票', 幣別: 'JPY', 金額: '60', 付款人: 'Carol', 分攤者: 'Bob' },
  ]);
  await saveEnabledSimplification(world);
  await viewBrowserSettlement(page, world);
  await assertPersistedSimplificationScreen(page, world);
});
