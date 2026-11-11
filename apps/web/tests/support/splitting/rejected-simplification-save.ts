import { expect, type Page, type Route } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { splittingTripId } from '../../../../api/tests/support/splitting/members-fixture.js';
import { readBrowserSplittingSnapshot } from './fixture.js';
import type { RepaymentBrowserWrite } from './repayment-draft.js';
import {
  settlementScreenKey,
  settlementScreenWritesKey,
  type ConfirmedSettlementScreen,
} from './settlement-screen.js';

export const rejectedSimplificationSavePhrase = '本次簡化付款保存明確失敗';

export const rejectedSimplificationSaveKey = 'splitting:rejectedSimplificationSave';

export const simplificationSaveRejection = {
  status: 400,
  body: { code: 'VALIDATION_ERROR', message: '無法保存簡化付款，請重試。' },
} as const;

export interface RejectedSimplificationSave {
  readonly confirmed: ConfirmedSettlementScreen;
  readonly requests: RepaymentBrowserWrite[];
  restore(): Promise<void>;
}

/** Reject before forwarding: a definitive 4xx, never a committed but lost response. */
export async function arrangeRejectedSimplificationSave(
  page: Page,
  world: LedgerWorld,
): Promise<void> {
  const confirmed = world.get<ConfirmedSettlementScreen>(settlementScreenKey);
  expect(confirmed.trip.simplifyDebts).toBe(false);
  expect(confirmed.snapshot.settlement.simplifyDebts).toBe(false);
  expect(confirmed.snapshot.settlement.arrangements).toHaveLength(2);
  expect(confirmed.trip.accountingRevision).toBe(confirmed.snapshot.settlement.accountingRevision);
  expect(world.get<RepaymentBrowserWrite[]>(settlementScreenWritesKey)).toEqual([]);
  expect(await readBrowserSplittingSnapshot(world)).toEqual(confirmed.snapshot);
  const control = page.getByRole('switch', { name: '簡化付款', exact: true });
  await expect(control).not.toBeChecked();
  const path = `/api/trips/${splittingTripId(world)}`;
  const requests: RepaymentBrowserWrite[] = [];
  const handler = async (route: Route): Promise<void> => {
    const request = route.request();
    if (request.method() !== 'PATCH' || new URL(request.url()).pathname !== path) {
      await route.continue();

      return;
    }
    const body: unknown = request.postDataJSON();
    requests.push({ method: request.method(), path, body });
    expect(body).toEqual({ simplifyDebts: true });
    // Deliberately no route.fetch(): the real trip cannot have been modified.
    await route.fulfill({
      status: simplificationSaveRejection.status,
      contentType: 'application/json',
      body: JSON.stringify(simplificationSaveRejection.body),
    });
  };
  const pattern = `**${path}`;
  const state: RejectedSimplificationSave = {
    confirmed: structuredClone(confirmed),
    requests,
    restore: () => page.unroute(pattern, handler),
  };
  await page.route(pattern, handler);
  world.set(rejectedSimplificationSaveKey, state);
  expect(requests).toEqual([]);
  expect(world.get<RepaymentBrowserWrite[]>(settlementScreenWritesKey)).toEqual([]);
  await expect(control).not.toBeChecked();
  expect(await readBrowserSplittingSnapshot(world)).toEqual(confirmed.snapshot);
}
