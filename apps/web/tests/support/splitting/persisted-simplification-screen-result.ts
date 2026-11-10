import { expect, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { callApi } from '../../../../api/tests/support/seed.js';
import { splittingTripId } from '../../../../api/tests/support/splitting/members-fixture.js';
import { readBrowserSplittingSnapshot, type BrowserSplittingSnapshot } from './fixture.js';
import { assertArrangementsScreen } from './arrangements-screen-result.js';
import {
  savedSimplificationKey,
  type SavedSimplification,
} from './saved-simplification-fixture.js';
import {
  settlementScreenKey,
  settlementScreenWritesKey,
  type ConfirmedSettlementScreen,
  type ModeTripProjection,
} from './settlement-screen.js';
import type { RepaymentBrowserWrite } from './repayment-draft.js';

export const persistedSimplificationScreenPhrase = '簡化付款仍開啟且重現 Alice 支付 Carol JPY 60';

/** Reopening must retain the entire saved revision, source graph, and rational projection. */
export function assertPersistedSimplificationAuthority(
  saved: SavedSimplification,
  screen: ConfirmedSettlementScreen,
  trip: ModeTripProjection,
  current: BrowserSplittingSnapshot,
): void {
  expect(saved.trip.simplifyDebts).toBe(true);
  expect(saved.snapshot.settlement.simplifyDebts).toBe(true);
  expect(saved.trip.accountingRevision).toBe(saved.snapshot.settlement.accountingRevision);
  expect(screen.trip).toEqual(saved.trip);
  expect(screen.snapshot).toEqual(saved.snapshot);
  expect(trip).toEqual(saved.trip);
  expect(current).toEqual(saved.snapshot);
}

/** Only reads: never repair the persisted mode by PATCH or toggle the switch in Then. */
export async function assertPersistedSimplificationScreen(
  page: Page,
  world: LedgerWorld,
): Promise<void> {
  const saved = world.get<SavedSimplification>(savedSimplificationKey);
  const screen = world.get<ConfirmedSettlementScreen>(settlementScreenKey);
  expect(world.get<RepaymentBrowserWrite[]>(settlementScreenWritesKey)).toEqual([]);
  const response = await callApi(world, 'GET', `/api/trips/${splittingTripId(world)}`);
  expect(response.status(), 'Reopened trip must expose its saved mode').toBe(200);
  const trip = (await response.json()) as ModeTripProjection;
  assertPersistedSimplificationAuthority(
    saved,
    screen,
    trip,
    await readBrowserSplittingSnapshot(world),
  );
  const control = page.getByRole('switch', { name: '簡化付款', exact: true });
  await expect(control).toBeVisible();
  await expect(control).toBeChecked();
  await assertArrangementsScreen(page, world, [
    { 付款人: 'Alice', 收款人: 'Carol', 幣別: 'JPY', 金額: '60', 顯示: 'JPY 60' },
  ]);
  const links = page.locator(`a[href*="/trips/${splittingTripId(world)}/settlements/new"]`);
  expect(
    await links.evaluateAll((elements) =>
      elements.map((element) => (element as HTMLAnchorElement).href),
    ),
  ).toEqual(screen.arrangementLinks);
  expect(await readBrowserSplittingSnapshot(world)).toEqual(saved.snapshot);
  expect(world.get<RepaymentBrowserWrite[]>(settlementScreenWritesKey)).toEqual([]);
}
