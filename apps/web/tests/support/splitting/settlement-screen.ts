import { expect, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { splittingTripId } from '../../../../api/tests/support/splitting/members-fixture.js';
import { snapshotSplittingSources } from '../../../../api/tests/support/splitting/expense-fixture.js';
import {
  assertSimplificationCountProjection,
  type CountSettlementView,
} from '../../../../api/tests/support/splitting/simplification-count-result.js';
import { readBrowserSplittingSnapshot, type BrowserSplittingSnapshot } from './fixture.js';
import type { RepaymentBrowserWrite } from './repayment-draft.js';

export const enabledSettlementScreenPhrase = 'owner 已開啟簡化付款的結算畫面';

export const settlementScreenKey = 'splitting:browserSettlementScreen';

export const settlementScreenWritesKey = 'splitting:browserSettlementScreenWrites';

export interface ModeTripProjection {
  id: string;
  accountingRevision: string;
  simplifyDebts: boolean;
}

export interface ConfirmedSettlementScreen {
  trip: ModeTripProjection;
  snapshot: BrowserSplittingSnapshot;
  text: string;
  arrangementLinks: string[];
}

export function assertSettlementScreenRevision(
  tripId: string,
  enabled: boolean,
  trip: ModeTripProjection,
  view: CountSettlementView,
  snapshot: BrowserSplittingSnapshot,
): void {
  expect(trip.id).toBe(tripId);
  expect(trip.simplifyDebts).toBe(enabled);
  expect(view.simplifyDebts).toBe(enabled);
  expect(trip.accountingRevision).toBe(snapshot.settlement.accountingRevision);
  const { explanationDetails: _details, ...baseView } = view as CountSettlementView & {
    explanationDetails?: unknown;
  };
  expect(baseView).toEqual(snapshot.settlement);
  assertSimplificationCountProjection(snapshot.sources, view);
}

/** Already-persisted mode only: no PATCH and no local switch operation. */
export async function openConfirmedSettlementScreen(
  page: Page,
  world: LedgerWorld,
  enabled: boolean,
): Promise<void> {
  const tripId = splittingTripId(world);
  const before = await readBrowserSplittingSnapshot(world);
  expect(before.settlement.simplifyDebts, 'Given requires the already-persisted mode').toBe(
    enabled,
  );
  const base = `/api/trips/${tripId}`;
  world.set(settlementScreenWritesKey, []);
  page.on('request', (request) => {
    const path = new URL(request.url()).pathname;
    if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method()) && path.startsWith(base))
      world
        .get<RepaymentBrowserWrite[]>(settlementScreenWritesKey)
        .push({ method: request.method(), path, body: request.postDataJSON() });
  });
  const responseFor = (path: string) =>
    page.waitForResponse(
      (response) =>
        response.request().method() === 'GET' && new URL(response.url()).pathname === path,
    );
  const [tripResponse, settlementResponse] = await Promise.all([
    responseFor(base),
    responseFor(`${base}/settlement`),
    page.goto(`/trips/${tripId}/settlement`),
  ]);
  expect(tripResponse.status(), 'Page must load its real trip authority').toBe(200);
  expect(settlementResponse.status(), 'Page must load its real settlement authority').toBe(200);
  const trip = (await tripResponse.json()) as ModeTripProjection;
  const view = (await settlementResponse.json()) as CountSettlementView;
  assertSettlementScreenRevision(tripId, enabled, trip, view, before);
  world.set('splitting:browserUISettlementView', view);
  world.set('splitting:browserUISettlementURL', settlementResponse.url());
  const english = world.state.get('splitting:expectedSettlementLanguage') === 'en';
  const control = english
    ? page.getByRole('switch')
    : page.getByRole('switch', { name: '簡化付款', exact: true });
  await expect(control).toBeVisible();
  await expect(control).toBeChecked({ checked: enabled });
  const links = page.locator(`a[href*="/trips/${tripId}/settlements/new"]`);
  await expect(links, 'Screen must retain all confirmed arrangements').toHaveCount(
    view.arrangements.length,
  );
  const arrangementLinks = await links.evaluateAll((elements) =>
    elements.map((element) => (element as HTMLAnchorElement).href),
  );
  for (const arrangement of view.arrangements)
    expect(
      arrangementLinks.filter((href) =>
        [...new URL(href).searchParams.values()].includes(arrangement.key),
      ),
      'Each link must retain its confirmed opaque arrangement key',
    ).toHaveLength(1);
  const screen: ConfirmedSettlementScreen = {
    trip: structuredClone(trip),
    snapshot: structuredClone(before),
    text: await page.locator('body').innerText(),
    arrangementLinks,
  };
  world.set(settlementScreenKey, screen);
  world.set('splitting:before', before.sources);
  world.set('splitting:sourceSnapshot', before.sources);
  world.set('splitting:revision', view.accountingRevision);
  world.set('splitting:browserConfirmedSettlement', structuredClone(view));
  expect(world.get<RepaymentBrowserWrite[]>(settlementScreenWritesKey)).toEqual([]);
  expect(await snapshotSplittingSources(world)).toEqual(before.sources);
  expect(await readBrowserSplittingSnapshot(world)).toEqual(before);
}
