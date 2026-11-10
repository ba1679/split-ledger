import type { Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { readBrowserSplittingSnapshot } from './fixture.js';
import { openConfirmedSettlementScreen } from './settlement-screen.js';

export const viewSettlementPhrase = 'owner 查看分帳結算';

/** Open the current persisted mode without changing it; retain exact API and UI evidence. */
export async function viewBrowserSettlement(page: Page, world: LedgerWorld): Promise<void> {
  const before = await readBrowserSplittingSnapshot(world);
  await openConfirmedSettlementScreen(page, world, before.settlement.simplifyDebts);
}
