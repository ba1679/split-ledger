import { expect } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import type { SettlementLoss } from './settlement-loss.js';
import { managementUI } from '../trips/management-fixture.js';

export async function saveLostSettlement(world: LedgerWorld): Promise<void> {
  const state = world.get<SettlementLoss>('loading:settlementLoss'),
    ui = managementUI(world);
  expect(state.writes.length).toBe(0);
  expect(ui.writes.length).toBe(0);
  await state.data.control.click();
  await expect.poll(() => Boolean(state.after) || state.errors.length > 0).toBe(true);
  expect(state.errors.map(String)).toEqual([]);
  expect(state.writes.length).toBe(1);
  expect(state.exchanges.length).toBe(1);
  expect(state.finished).toBe(1);
  const command = state.command!;
  await expect
    .poll(() =>
      state.proofReads.some(
        (read) =>
          read.path === `${state.data.path}/${command.id}` ||
          read.path === `/api/trips/${state.data.tripId}/repayments/${command.repaymentId}`,
      ),
    )
    .toBe(true);
  await expect.poll(() => state.pendingProofs).toBeGreaterThan(0);
  expect(state.proofMode).toBe('hold');
  if (state.writes[0]!.failure() === null) {
    // WebKit can complete the transport after the genuine 201 JSON was truncated.
    const response = await state.writes[0]!.response();
    expect(response?.status()).toBe(201);
    const body = await response!.body();
    expect(body).toEqual(state.exchanges[0]!.body.subarray(0, 1));
    expect(Number(response!.headers()['content-length'])).toBeGreaterThan(body.length);
    await expect(response!.json()).rejects.toThrow();
  }
  expect(command.paidAmount).toBe(state.amount);
  expect(command.paidOn).toBe(state.date.replaceAll('/', '-'));
  expect(ui.writes.length).toBe(1);
  expect(ui.writes[0] === state.writes[0]).toBe(true);
  world.set('loading:paymentAct', { commandId: command.id, repaymentId: command.repaymentId });
}
