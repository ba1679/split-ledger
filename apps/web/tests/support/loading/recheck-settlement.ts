import { expect } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import type { SettlementLoss } from './settlement-loss.js';
import { settlementRecheckName } from './end-settlement-verification.js';
import { managementUI, waitForManagementReads } from '../trips/management-fixture.js';

export async function recheckSettlement(world: LedgerWorld): Promise<void> {
  const state = world.get<SettlementLoss>('loading:settlementLoss'),
    ui = managementUI(world),
    command = state.command!;
  expect(state.proofMode).toBe('available');
  expect(ui.writes.length).toBe(1);
  const start = state.proofReads.length,
    paths = [
      `${state.data.path}/${command.id}`,
      `/api/trips/${state.data.tripId}/repayments/${command.repaymentId}`,
    ];
  await ui.page.getByRole('button', { name: settlementRecheckName }).click();
  await expect
    .poll(() => state.proofReads.slice(start).some((read) => paths.includes(read.path)))
    .toBe(true);
  const specific = () => state.proofReads.slice(start).filter((read) => paths.includes(read.path));
  for (const read of specific()) {
    expect(read.mode).toBe('available');
    expect(read.request.method()).toBe('GET');
    const response = await read.request.response();
    expect(response?.status()).toBe(200);
    expect(await response!.finished()).toBeNull();
    expect(await response!.json()).toEqual(
      read.path === paths[0] ? state.committed : state.committed!.repayment,
    );
  }
  await waitForManagementReads(ui);
  await expect.poll(() => state.pendingProofs).toBe(0);
  expect(state.writes.length).toBe(1);
  expect(ui.writes.length).toBe(1);
  expect(state.errors.map(String)).toEqual([]);
  world.set('loading:paymentRechecked', {
    commandId: command.id,
    repaymentId: command.repaymentId,
    readStart: start,
  });
}
