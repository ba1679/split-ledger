import { expect, type Page, type Response } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { splittingTripId } from '../../../../api/tests/support/splitting/members-fixture.js';
import { callApi } from '../../../../api/tests/support/seed.js';
import type { CountSettlementView } from '../../../../api/tests/support/splitting/simplification-count-result.js';
import { readBrowserSplittingSnapshot, type BrowserSplittingSnapshot } from './fixture.js';
import {
  assertSettlementScreenRevision,
  settlementScreenKey,
  type ConfirmedSettlementScreen,
  type ModeTripProjection,
} from './settlement-screen.js';

export const enableSimplificationPhrase = 'owner 開啟簡化付款';

export const simplificationToggleKey = 'splitting:browserSimplificationToggle';

export interface SimplificationToggle {
  enabled: boolean;
  payload: unknown;
  status: number;
  response: unknown;
  outcome: 'saved' | 'rejected' | 'unconfirmed';
  before: ConfirmedSettlementScreen;
  after: BrowserSplittingSnapshot;
  confirmed: CountSettlementView | null;
}

export function simplificationSaveOutcome(status: number): SimplificationToggle['outcome'] {
  return status >= 200 && status < 300
    ? 'saved'
    : status >= 400 && status < 500
      ? 'rejected'
      : 'unconfirmed';
}

/** One real switch activation; only a successful authority revision becomes confirmed. */
export async function toggleSimplification(
  page: Page,
  world: LedgerWorld,
  enabled: boolean,
): Promise<void> {
  const before = world.get<ConfirmedSettlementScreen>(settlementScreenKey);
  expect(before.trip.simplifyDebts, 'The operation must actually change the saved mode').toBe(
    !enabled,
  );
  const control = page.getByRole('switch', { name: '簡化付款', exact: true });
  await expect(control).toBeVisible();
  await expect(control).toBeChecked({ checked: !enabled });
  const base = `/api/trips/${splittingTripId(world)}`;
  const patches: Response[] = [];
  const settlements: Response[] = [];
  const observe = (response: Response): void => {
    const path = new URL(response.url()).pathname;
    if (path === base && response.request().method() === 'PATCH') patches.push(response);
    if (
      path === `${base}/settlement` &&
      response.request().method() === 'GET' &&
      patches.length > 0
    )
      settlements.push(response);
  };
  page.on('response', observe);
  try {
    await control.click();
    await expect
      .poll(() => patches.length, { message: 'Switch must issue its real PATCH' })
      .toBe(1);
    const patch = patches[0]!;
    const payload: unknown = patch.request().postDataJSON();
    expect(payload).toEqual({ simplifyDebts: enabled });
    const response: unknown = await patch.json();
    const outcome = simplificationSaveOutcome(patch.status());
    let confirmed: CountSettlementView | null = null;
    if (outcome === 'saved') {
      const saved = response as ModeTripProjection;
      expect(saved.simplifyDebts).toBe(enabled);
      expect(saved.accountingRevision).toBe(
        (BigInt(before.trip.accountingRevision) + 1n).toString(),
      );
      // Query completion must come from the browser after this PATCH, never only a test API read.
      await expect
        .poll(
          async () => {
            for (const reply of settlements) {
              expect(reply.status()).toBe(200);
              const view = (await reply.json()) as CountSettlementView;
              if (
                view.simplifyDebts === enabled &&
                view.accountingRevision === saved.accountingRevision
              )
                confirmed = view;
            }

            return confirmed !== null;
          },
          { message: 'Browser must refetch settlement at the saved mode and revision' },
        )
        .toBe(true);
      await expect(control).toBeChecked({ checked: enabled });
    } else {
      await expect(page.getByRole('alert')).toBeVisible();
      // Neither a rejected request nor a server failure may publish optimistic recommendations.
      await expect(control).toBeChecked({ checked: before.trip.simplifyDebts });
    }
    const after = await readBrowserSplittingSnapshot(world);
    if (outcome === 'saved') {
      const tripReply = await callApi(world, 'GET', base);
      expect(tripReply.status()).toBe(200);
      assertSettlementScreenRevision(
        splittingTripId(world),
        enabled,
        (await tripReply.json()) as ModeTripProjection,
        confirmed!,
        after,
      );
      for (const key of [
        'members',
        'expenses',
        'shares',
        'repayments',
        'settlements',
        'adjustments',
      ] as const)
        expect(after.sources[key], 'Changing mode must preserve financial history').toEqual(
          before.snapshot.sources[key],
        );
      expect(after.settlement.balances).toEqual(before.snapshot.settlement.balances);
      world.set('splitting:browserConfirmedSettlement', structuredClone(confirmed));
      world.set('splitting:revision', after.settlement.accountingRevision);
    } else if (outcome === 'rejected') {
      expect(after).toEqual(before.snapshot);
    }
    expect(patches, 'One activation must never auto-retry the write').toHaveLength(1);
    world.set(simplificationToggleKey, {
      enabled,
      payload,
      status: patch.status(),
      response,
      outcome,
      before,
      after,
      confirmed,
    } satisfies SimplificationToggle);
  } finally {
    page.off('response', observe);
  }
}
