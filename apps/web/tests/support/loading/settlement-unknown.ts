import { expect } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import type { TripManagementSnapshot } from '../../../../api/tests/support/trip-management/context.js';
import { managementSnapshot } from '../../../../api/tests/support/trip-management/baseline.js';
import { assertOtherDataUnchanged } from '../../../../api/tests/support/trip-management/preservation.js';
import type { SettlementLoss } from './settlement-loss.js';
import { managementUI } from '../trips/management-fixture.js';
import { assertSpinnerOnly } from './spinner-result.js';

export async function assertSettlementDraft(world: LedgerWorld): Promise<void> {
  const state = world.get<SettlementLoss>('loading:settlementLoss'),
    page = managementUI(world).page,
    command = state.command!;
  await expect(page.getByLabel('實付金額', { exact: true })).toHaveValue(state.amount);
  await expect(page.getByRole('textbox', { name: '結清日期', exact: true })).toHaveValue(
    state.date,
  );
  const due = page.getByRole('region', { name: '這筆安排的應付金額', exact: true });
  await expect(due.getByRole('heading', { name: 'Amy → Alice', exact: true })).toBeVisible();
  await expect(due).toContainText('JPY 100');
  const form = page.locator('form[data-command-id]');
  await expect(form).toHaveAttribute('data-command-id', command.id);
  await expect(form).toHaveAttribute('data-repayment-id', command.repaymentId);
  await expect(state.data.control).toBeDisabled();
  const visible = await page.locator('body').innerText();
  expect(visible).not.toContain(command.id);
  expect(visible).not.toContain(command.repaymentId);
}

export async function assertSettlementFactsStable(world: LedgerWorld): Promise<void> {
  const state = world.get<SettlementLoss>('loading:settlementLoss'),
    ui = managementUI(world),
    command = state.command!;
  expect(state.writes.length).toBe(1);
  expect(ui.writes.length).toBe(1);
  expect(state.exchanges.length).toBe(1);
  expect(state.finished).toBe(1);
  expect(state.writes[0]!.postDataJSON()).toEqual(command);
  const allowed = [
    `${state.data.path}/${command.id}`,
    `/api/trips/${state.data.tripId}/repayments/${command.repaymentId}`,
  ];
  const lookups = ui.reads.filter((request) =>
    /\/api\/trips\/[^/]+\/(?:settlements|repayments)\/[^/]+$/.test(new URL(request.url()).pathname),
  );
  expect(lookups.length).toBeGreaterThan(0);
  expect(lookups.every((request) => allowed.includes(new URL(request.url()).pathname))).toBe(true);
  expect(await managementSnapshot(world)).toEqual(state.after);
  expect(state.after!.repayments.filter((row) => row.id === command.repaymentId).length).toBe(1);
  expect(state.after!.settlements.filter((row) => row.id === command.id).length).toBe(1);
  const untouched = world.get<{ id: string; before: TripManagementSnapshot }>(
    'loading:untouchedTrip',
  );
  expect(await managementSnapshot(world, untouched.id)).toEqual(untouched.before);
  await assertOtherDataUnchanged(world);
  expect(state.errors.map(String)).toEqual([]);
}

export async function assertSettlementVerifying(world: LedgerWorld): Promise<void> {
  const state = world.get<SettlementLoss>('loading:settlementLoss'),
    page = managementUI(world).page;
  expect(state.proofMode).toBe('hold');
  expect(state.pendingProofs).toBeGreaterThan(0);
  await expect(page.getByText(/結果(?:尚未確認|無法確認|仍未確認)/).first()).toBeVisible();
  await assertSpinnerOnly(
    page.getByRole('status', { name: /查證|確認.*(?:付款|實付|結清)|(?:付款|實付|結清).*確認/ }),
    /查證|確認.*(?:付款|實付|結清)|(?:付款|實付|結清).*確認/,
  );
  expect(await page.locator('[aria-busy="true"]').count()).toBeGreaterThan(0);
  await expect(
    page.getByRole('status').filter({
      hasText:
        /^\s*(?:結清成功|已結清|(?:實付|付款)已(?:確認|保存|儲存)|保存失敗|儲存失敗|結清失敗)/,
    }),
  ).toHaveCount(0);
  await expect(page.getByRole('progressbar')).toHaveCount(0);
  await assertSettlementDraft(world);
  await assertSettlementFactsStable(world);
}
