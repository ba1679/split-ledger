import { expect } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { callApi } from '../../../../api/tests/support/seed.js';
import { splittingTripId } from '../../../../api/tests/support/splitting/members-fixture.js';
import type { CountSettlementView } from '../../../../api/tests/support/splitting/simplification-count-result.js';
import { readBrowserSplittingSnapshot, type BrowserSplittingSnapshot } from './fixture.js';
import { assertSettlementScreenRevision, type ModeTripProjection } from './settlement-screen.js';

export const savedSimplificationPhrase = '該旅行已保存簡化付款開啟';

export const savedSimplificationKey = 'splitting:browserSavedSimplification';

export interface SavedSimplification {
  trip: ModeTripProjection;
  snapshot: BrowserSplittingSnapshot;
}

export function assertSavedSimplification(
  tripId: string,
  before: BrowserSplittingSnapshot,
  trip: ModeTripProjection,
  after: BrowserSplittingSnapshot,
): void {
  assertSettlementScreenRevision(
    tripId,
    true,
    trip,
    after.settlement as CountSettlementView,
    after,
  );
  if (!before.settlement.simplifyDebts)
    expect(BigInt(trip.accountingRevision)).toBe(BigInt(before.settlement.accountingRevision) + 1n);
  for (const key of [
    'members',
    'expenses',
    'shares',
    'repayments',
    'settlements',
    'adjustments',
  ] as const)
    expect(after.sources[key], 'Mode fixture must preserve source facts').toEqual(
      before.sources[key],
    );
  expect(after.expenses).toEqual(before.expenses);
  expect(after.repayments).toEqual(before.repayments);
  expect(after.totals).toEqual(before.totals);
}

/** Arrange persisted authority through API only; the tested screen is opened by a later step. */
export async function saveEnabledSimplification(world: LedgerWorld): Promise<void> {
  const tripId = splittingTripId(world);
  const before = await readBrowserSplittingSnapshot(world);
  const response = await callApi(world, 'PATCH', `/api/trips/${tripId}`, {
    simplifyDebts: true,
  });
  expect(response.status(), 'Fixture must persist enabled mode through the real API').toBe(200);
  const tripResponse = await callApi(world, 'GET', `/api/trips/${tripId}`);
  expect(tripResponse.status(), 'Fixture must read persisted trip authority').toBe(200);
  const trip = (await tripResponse.json()) as ModeTripProjection;
  const snapshot = await readBrowserSplittingSnapshot(world);
  assertSavedSimplification(tripId, before, trip, snapshot);
  world.set(savedSimplificationKey, {
    trip: structuredClone(trip),
    snapshot: structuredClone(snapshot),
  } satisfies SavedSimplification);
  world.set('splitting:before', snapshot.sources);
  world.set('splitting:sourceSnapshot', snapshot.sources);
  world.set('splitting:revision', trip.accountingRevision);
  world.set('splitting:browserConfirmedSettlement', structuredClone(snapshot.settlement));
}
