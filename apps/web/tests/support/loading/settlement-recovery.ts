import { expect, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { ownerRead } from '../../../../api/tests/support/trip-management/preservation.js';
import { arrangeSettlementLoss, type SettlementLoss } from './settlement-loss.js';
import { saveLostSettlement } from './save-lost-settlement.js';
import { endSettlementVerification, settlementRecheckName } from './end-settlement-verification.js';
import { assertSettlementStillUnknown } from './settlement-still-unknown.js';
import { assertSettlementDraft } from './settlement-unknown.js';
import { managementUI } from '../trips/management-fixture.js';

export async function arrangeSettlementRecovery(page: Page, world: LedgerWorld): Promise<void> {
  await arrangeSettlementLoss(page, world);
  await saveLostSettlement(world);
  await endSettlementVerification(world);
  await assertSettlementStillUnknown(world);
  const state = world.get<SettlementLoss>('loading:settlementLoss'),
    readsBefore = state.proofReads.length;
  state.proofMode = 'available';
  const response = await ownerRead(world, `${state.data.path}/${state.command!.id}`);
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual(state.committed);
  await expect(page.getByRole('button', { name: settlementRecheckName })).toBeEnabled();
  await assertSettlementDraft(world);
  expect(state.proofReads.length).toBe(readsBefore);
  expect(state.writes.length).toBe(1);
  expect(managementUI(world).writes.length).toBe(1);
  world.set('loading:paymentRecheckReady', {
    commandId: state.command!.id,
    repaymentId: state.command!.repaymentId,
    readsBefore,
  });
}
