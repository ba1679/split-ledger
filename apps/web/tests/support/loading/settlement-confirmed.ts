import { expect } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { ownerRead } from '../../../../api/tests/support/trip-management/preservation.js';
import { assertMemberBalanceProjection } from '../../../../api/tests/support/splitting/member-balances-result.js';
import type { SettlementLoss } from './settlement-loss.js';
import { assertSettlementFactsStable } from './settlement-unknown.js';
import { managementUI, waitForManagementReads } from '../trips/management-fixture.js';

export async function assertSettlementConfirmed(world: LedgerWorld): Promise<void> {
  const state = world.get<SettlementLoss>('loading:settlementLoss'),
    ui = managementUI(world),
    page = ui.page,
    command = state.command!;
  const act = world.get<{ commandId: string; repaymentId: string; readStart: number }>(
    'loading:paymentRechecked',
  );
  expect(act).toMatchObject({ commandId: command.id, repaymentId: command.repaymentId });
  const success = page
    .getByRole('status')
    .filter({ hasText: /結清成功|原實付已確認|付款已確認/ })
    .first();
  await expect(success).toBeVisible();
  await expect(success).toContainText(/實付\s*JPY\s*100(?:\.0+)?(?![\d.])/);
  await expect(page.getByText(/結果(?:尚未確認|無法確認|仍未確認)/)).toHaveCount(0);
  const date = page.getByRole('textbox', { name: '結清日期', exact: true });
  const receiptDate = page.getByText(/^2027[/-]03[/-]12$/).first();
  await expect
    .poll(
      async () =>
        ((await date.isVisible()) && (await date.inputValue()) === state.date) ||
        (await receiptDate.isVisible()),
    )
    .toBe(true);
  await waitForManagementReads(ui);
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
  await expect(page.getByRole('progressbar')).toHaveCount(0);
  const recent = state.proofReads.slice(act.readStart),
    paths = [
      `${state.data.path}/${command.id}`,
      `/api/trips/${state.data.tripId}/repayments/${command.repaymentId}`,
    ];
  const specific = recent.filter((read) => paths.includes(read.path));
  expect(specific.length).toBeGreaterThan(0);
  for (const read of specific) {
    expect(read.mode).toBe('available');
    const response = await read.request.response();
    expect(response?.status()).toBe(200);
    expect(await response!.finished()).toBeNull();
    expect(await response!.json()).toEqual(
      read.path === paths[0] ? state.committed : state.committed!.repayment,
    );
  }
  const proof = await ownerRead(world, paths[0]!);
  expect(proof.status()).toBe(200);
  expect(await proof.json()).toEqual(state.committed);
  const payment = await ownerRead(world, paths[1]!);
  expect(payment.status()).toBe(200);
  expect(await payment.json()).toEqual(state.committed!.repayment);
  const balance = await ownerRead(world, `/api/trips/${state.data.tripId}/settlement`);
  expect(balance.status()).toBe(200);
  const view = await balance.json();
  assertMemberBalanceProjection(
    state.after!,
    view,
    [
      { 成員: 'Alice', 幣別: 'JPY', 淨額: '0' },
      { 成員: 'Amy', 幣別: 'JPY', 淨額: '0' },
    ],
    (name) => String(state.after!.members.find((member) => member.name === name)!.id),
  );
  expect(view.arrangements).toEqual([]);
  expect(state.after!.adjustments.filter((row) => row.settlement_id === command.id).length).toBe(2);
  for (const row of state.after!.adjustments.filter((row) => row.settlement_id === command.id))
    expect(String(row.numerator)).toBe('0');
  await assertSettlementFactsStable(world);
}
