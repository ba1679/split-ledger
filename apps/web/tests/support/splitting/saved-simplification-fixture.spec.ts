import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { splittingMemberId } from '../../../../api/tests/support/splitting/members-fixture.js';
import {
  browserSplittingStateKey,
  seedBrowserSplittingExpenses,
  type BrowserSplittingSnapshot,
} from './fixture.js';
import {
  assertSavedSimplification,
  saveEnabledSimplification,
  savedSimplificationKey,
  savedSimplificationPhrase,
  type SavedSimplification,
} from './saved-simplification-fixture.js';

test('T144: saved mode requires matching authoritative revision and unchanged sources', () => {
  const before: BrowserSplittingSnapshot = {
    sources: {
      trips: [{ id: 'trip', accounting_revision: '4', simplify_debts: false }],
      members: [],
      expenses: [],
      shares: [],
      repayments: [],
      settlements: [],
      adjustments: [],
    },
    expenses: { items: [], totalCount: 0, nextCursor: null },
    settlement: { accountingRevision: '4', simplifyDebts: false, balances: [], arrangements: [] },
    repayments: { items: [] },
    totals: { totals: [] },
  };
  const after = structuredClone(before);
  after.sources = {
    ...after.sources,
    trips: [{ id: 'trip', accounting_revision: '5', simplify_debts: true }],
  };
  after.settlement = {
    ...after.settlement,
    accountingRevision: '5',
    simplifyDebts: true,
    ...{ directArrangementCount: 0, suggestedArrangementCount: 0 },
  };
  const trip = { id: 'trip', accountingRevision: '5', simplifyDebts: true };
  assertSavedSimplification('trip', before, trip, after);
  expect(() =>
    assertSavedSimplification('trip', before, { ...trip, simplifyDebts: false }, after),
  ).toThrow();
  expect(() =>
    assertSavedSimplification('trip', before, { ...trip, accountingRevision: '4' }, after),
  ).toThrow();
  const changed = structuredClone(after);
  changed.sources = { ...changed.sources, members: [{ id: 'unexpected' }] };
  expect(() => assertSavedSimplification('trip', before, trip, changed)).toThrow();
});

test('T144: isolated Given saves real mode and exact arrangements without opening the tested screen', async ({
  page,
  world,
}) => {
  await seedBrowserSplittingExpenses(page, world, [
    { 項目: '車票', 幣別: 'JPY', 金額: '60', 付款人: 'Bob', 分攤者: 'Alice' },
    { 項目: '門票', 幣別: 'JPY', 金額: '60', 付款人: 'Carol', 分攤者: 'Bob' },
  ]);
  const initial = world.get<BrowserSplittingSnapshot>(browserSplittingStateKey);
  const url = page.url();
  await runIsolatedStep(
    { phrase: savedSimplificationPhrase, input: undefined, execute: saveEnabledSimplification },
    world,
  );
  expect(page.url()).toBe(url);
  const saved = world.get<SavedSimplification>(savedSimplificationKey);
  expect(saved.snapshot.settlement.arrangements).toEqual([
    expect.objectContaining({
      debtorMemberId: splittingMemberId(world, 'Alice'),
      creditorMemberId: splittingMemberId(world, 'Carol'),
      currencyCode: 'JPY',
      amount: { numerator: '60', denominator: '1', minorUnit: 0 },
    }),
  ]);
  expect(initial.settlement.simplifyDebts).toBe(false);
  expect(saved.trip.simplifyDebts).toBe(true);
  expect(world.get('splitting:browserConfirmedSettlement')).toEqual(saved.snapshot.settlement);
});
