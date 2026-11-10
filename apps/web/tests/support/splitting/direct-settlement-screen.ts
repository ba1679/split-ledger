import { expect, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { callApi } from '../../../../api/tests/support/seed.js';
import { splittingTripId } from '../../../../api/tests/support/splitting/members-fixture.js';
import { readBrowserSplittingSnapshot } from './fixture.js';
import { openConfirmedSettlementScreen } from './settlement-screen.js';

export const directSettlementScreenPhrase = 'owner 已開啟關閉簡化付款的結算畫面';

/** Arrange the persisted mode; the tested switch operation belongs to a later When. */
export async function openDirectSettlementScreen(page: Page, world: LedgerWorld): Promise<void> {
  const before = await readBrowserSplittingSnapshot(world);
  if (before.settlement.simplifyDebts) {
    const reply = await callApi(world, 'PATCH', `/api/trips/${splittingTripId(world)}`, {
      simplifyDebts: false,
    });
    expect(reply.status(), 'Fixture must persist disabled mode through the real API').toBe(200);
    const after = await readBrowserSplittingSnapshot(world);
    expect(after.settlement.simplifyDebts).toBe(false);
    expect(after.settlement.accountingRevision).toBe(
      (BigInt(before.settlement.accountingRevision) + 1n).toString(),
    );
    for (const key of [
      'members',
      'expenses',
      'shares',
      'repayments',
      'settlements',
      'adjustments',
    ] as const)
      expect(after.sources[key], 'Arranging mode must preserve all financial sources').toEqual(
        before.sources[key],
      );
  }
  await openConfirmedSettlementScreen(page, world, false);
}
