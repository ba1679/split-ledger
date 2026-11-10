import { test, expect } from '../fixtures.js';
import { callApi } from '../../../../api/tests/support/seed.js';
import { splittingTripId } from '../../../../api/tests/support/splitting/members-fixture.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import type { CountSettlementView } from '../../../../api/tests/support/splitting/simplification-count-result.js';
import { seedBrowserSplittingExpenses, type BrowserSplittingSnapshot } from './fixture.js';
import {
  assertSettlementScreenRevision,
  enabledSettlementScreenPhrase,
  openConfirmedSettlementScreen,
  settlementScreenKey,
  type ConfirmedSettlementScreen,
} from './settlement-screen.js';

test('T137: confirmed screen rejects client-only mode and mismatched trip or settlement revisions', () => {
  const view: CountSettlementView = {
    accountingRevision: '4',
    simplifyDebts: true,
    balances: [],
    arrangements: [],
    directArrangementCount: 0,
    suggestedArrangementCount: 0,
  };
  const snapshot: BrowserSplittingSnapshot = {
    sources: {
      trips: [{ id: 'trip', accounting_revision: '4', simplify_debts: true }],
      members: [],
      expenses: [],
      shares: [],
      repayments: [],
      settlements: [],
      adjustments: [],
    },
    expenses: { items: [], totalCount: 0, nextCursor: null },
    settlement: view,
    repayments: { items: [] },
    totals: { totals: [] },
  };
  const trip = { id: 'trip', accountingRevision: '4', simplifyDebts: true };
  assertSettlementScreenRevision('trip', true, trip, view, snapshot);
  expect(() =>
    assertSettlementScreenRevision('trip', true, { ...trip, simplifyDebts: false }, view, snapshot),
  ).toThrow();
  expect(() =>
    assertSettlementScreenRevision(
      'trip',
      true,
      { ...trip, accountingRevision: '3' },
      view,
      snapshot,
    ),
  ).toThrow();
  expect(() =>
    assertSettlementScreenRevision(
      'trip',
      true,
      trip,
      { ...view, accountingRevision: '5' },
      snapshot,
    ),
  ).toThrow();
});

test('T137: isolated Given opens persisted simplified screen and retains exact authority snapshots', async ({
  page,
  world,
}) => {
  await seedBrowserSplittingExpenses(page, world, [
    { 項目: '車票', 幣別: 'JPY', 金額: '60', 付款人: 'Bob', 分攤者: 'Alice' },
    { 項目: '門票', 幣別: 'JPY', 金額: '60', 付款人: 'Carol', 分攤者: 'Bob' },
  ]);
  const response = await callApi(world, 'PATCH', `/api/trips/${splittingTripId(world)}`, {
    simplifyDebts: true,
  });
  expect(response.status(), 'Arrange persisted true through real API').toBe(200);
  await runIsolatedStep(
    {
      phrase: enabledSettlementScreenPhrase,
      input: undefined,
      execute: () => openConfirmedSettlementScreen(page, world, true),
    },
    world,
  );
  const screen = world.get<ConfirmedSettlementScreen>(settlementScreenKey);
  expect(screen.snapshot.settlement.arrangements).toHaveLength(1);
  expect(screen.text).toContain('簡化付款');
  expect(screen.arrangementLinks).toHaveLength(1);
});
