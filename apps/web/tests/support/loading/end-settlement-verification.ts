import { expect } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import type { SettlementLoss } from './settlement-loss.js';
import { managementUI, waitForManagementReads } from '../trips/management-fixture.js';

export const settlementRecheckName = /^(再次查證|重新查證|查證結果|再次查證原實付)$/;

export async function endSettlementVerification(world: LedgerWorld): Promise<void> {
  const state = world.get<SettlementLoss>('loading:settlementLoss'),
    ui = managementUI(world);
  expect(state.proofMode).toBe('hold');
  expect(state.pendingProofs).toBeGreaterThan(0);
  expect(ui.writes.length).toBe(1);
  const original = state.command!;
  state.proofMode = 'fail';
  state.releaseProofs();
  await expect(ui.page.getByRole('button', { name: settlementRecheckName })).toBeEnabled();
  await waitForManagementReads(ui);
  await expect.poll(() => state.pendingProofs).toBe(0);
  expect(state.proofReads.length).toBeGreaterThan(0);
  expect(
    state.proofReads.every((read) => read.mode !== 'available' && read.request.failure() !== null),
  ).toBe(true);
  expect(state.writes.length).toBe(1);
  expect(ui.writes.length).toBe(1);
  expect(state.command === original).toBe(true);
  expect(state.errors.map(String)).toEqual([]);
  world.set('loading:paymentRoundEnded', {
    commandId: original.id,
    repaymentId: original.repaymentId,
  });
}
