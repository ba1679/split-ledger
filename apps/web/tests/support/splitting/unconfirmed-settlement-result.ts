import { expect, type Page, type Request } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { callApi } from '../../../../api/tests/support/seed.js';
import {
  splittingTripId,
  splittingMemberId,
} from '../../../../api/tests/support/splitting/members-fixture.js';
import { readBrowserSplittingSnapshot } from './fixture.js';
import {
  settlementFormKey,
  settlementWritesKey,
  type BrowserSettlementDraft,
} from './settlement-form.js';
import type { RepaymentBrowserWrite } from './repayment-draft.js';
import { settlementSaveKey, type BrowserSettlementSave } from './save-settlement.js';
import {
  lostSettlementResponseKey,
  assertSavedSettlement,
  type LostSettlementResponseState,
} from './lost-settlement-response.js';

export const unconfirmedSettlementPhrase = '畫面保留實付草稿並提示結清結果尚未確認';

/** A browser 404 cannot override a genuinely committed original transaction. */
export function assertUnconfirmedSettlementEvidence(
  action: BrowserSettlementSave,
  loss: LostSettlementResponseState,
  writes: RepaymentBrowserWrite[],
  tripId: string,
): void {
  expect(action.outcome).toBe('unconfirmed');
  expect(action.status).toBeNull();
  expect(action.response).toBeNull();
  expect(action.command).toEqual({ ...loss.draft, paidAmount: '33' });
  expect(action.command.paidOn).toBe('2027-03-12');
  expect(action.command.expectedAmount).toEqual({
    numerator: '100',
    denominator: '3',
    minorUnit: 0,
  });
  expect(action.command.id).not.toBe(action.command.repaymentId);
  expect(action.payload).toEqual(action.command);
  expect(loss.command).toEqual(action.command);
  expect(loss.ids.commandId).toBe(action.command.id);
  expect(loss.ids.repaymentId).toBe(action.command.repaymentId);
  expect(loss.availability).toBe('temporary-not-found');
  expect(loss.failure).toBeUndefined();
  expect(action.before).toEqual(loss.before);
  expect(loss.authoritativeAfter, 'The sole original POST really committed').toBeDefined();
  expect(loss.savedResponse).toBeDefined();
  expect(action.after).toEqual(loss.authoritativeAfter);
  const expected = [
    { method: 'POST', path: `/api/trips/${tripId}/settlements`, body: action.command },
  ];
  expect(writes).toEqual(expected);
  expect(loss.mutations).toEqual(expected);
  expect(loss.ids.mutationIds).toEqual([action.command.id]);
  expect(loss.lookups.length, 'Application must query the original UUID').toBeGreaterThan(0);
  for (const lookup of loss.lookups)
    expect(lookup).toEqual({ id: action.command.id, actualStatus: 200, browserStatus: 404 });
  expect(loss.ids.lookupIds).toEqual(loss.lookups.map((lookup) => lookup.id));
}

async function assertRetainedSettlementForm(
  page: Page,
  draft: BrowserSettlementDraft,
): Promise<void> {
  const form = page
    .locator('form')
    .filter({ has: page.getByRole('button', { name: '結清這筆安排', exact: true }) });
  await expect(form).toHaveCount(1);
  await expect(form).toHaveAttribute('data-command-id', draft.id);
  await expect(form).toHaveAttribute('data-repayment-id', draft.repaymentId);
  await expect(form.getByLabel('實付金額', { exact: true })).toHaveValue('33');
  await expect(form.getByRole('textbox', { name: '結清日期', exact: true })).toHaveValue(
    '2027/03/12',
  );
  await expect(page.getByText(/尚無法確認|尚未確認|結果未明/).first()).toBeVisible();
  const verify = page.getByRole('button', { name: /查證|確認(?:保存|儲存|結清)結果/ });
  await expect(verify).toHaveCount(1);
  await expect(verify).toBeVisible();
  await expect(verify).toBeEnabled();
  await expect(
    page
      .getByText(/結清成功|已結清|結清已儲存|結清已保存|安排已關閉|安排已結清/)
      .filter({ visible: true }),
  ).toHaveCount(0);
  await expect(
    page
      .getByText(/^(?:結清未保存|結清未儲存|結清未寫入|儲存失敗|保存失敗|結清不存在)$/)
      .filter({ visible: true }),
  ).toHaveCount(0);
  const arrangements = page.getByRole('region', { name: '付款安排', exact: true });
  if (await arrangements.isVisible()) {
    await expect(arrangements).toContainText(/舊資料|上次已確認|更新前|尚未更新/);
    await expect(arrangements.getByText('JPY 33.33', { exact: true }).first()).toBeVisible();
  }
}

/** Read only: keep the interception active and never press the verification entry. */
export async function assertUnconfirmedSettlement(page: Page, world: LedgerWorld): Promise<void> {
  const action = world.get<BrowserSettlementSave>(settlementSaveKey);
  const loss = world.get<LostSettlementResponseState>(lostSettlementResponseKey);
  const draft = world.get<BrowserSettlementDraft>(settlementFormKey);
  const tripId = splittingTripId(world);
  const originalResponse = world.response;
  const originalUrl = page.url();
  const writes: string[] = [];
  const capture = (request: Request) => {
    if (
      new URL(request.url()).pathname.startsWith('/api/') &&
      ['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method())
    )
      writes.push(`${request.method()} ${new URL(request.url()).pathname}`);
  };
  page.on('request', capture);
  try {
    await assertRetainedSettlementForm(page, draft);
    await expect.poll(() => loss.lookups.length, { timeout: 5000 }).toBeGreaterThan(0);
    expect(draft).toEqual(loss.draft);
    expect(draft.debtorMemberId).toBe(splittingMemberId(world, 'Amy'));
    expect(draft.creditorMemberId).toBe(splittingMemberId(world, 'Alice'));
    assertUnconfirmedSettlementEvidence(action, loss, world.get(settlementWritesKey), tripId);
    const current = await readBrowserSplittingSnapshot(world);
    expect(current).toEqual(loss.authoritativeAfter);
    assertSavedSettlement(loss.before, current, action.command, loss.savedResponse!, tripId);
    for (const [collection, id, expected] of [
      ['settlements', draft.id, loss.savedResponse],
      ['repayments', draft.repaymentId, loss.savedResponse!.repayment],
    ] as const) {
      const response = await callApi(world, 'GET', `/api/trips/${tripId}/${collection}/${id}`);
      expect(response.status()).toBe(200);
      expect(await response.json()).toEqual(expected);
    }
    await assertRetainedSettlementForm(page, draft);
    assertUnconfirmedSettlementEvidence(action, loss, world.get(settlementWritesKey), tripId);
    expect(await readBrowserSplittingSnapshot(world)).toEqual(current);
    expect(writes, 'Then must not resubmit or mutate the trip').toEqual([]);
    expect(page.url()).toBe(originalUrl);
  } finally {
    world.response = originalResponse;
    page.off('request', capture);
  }
}
