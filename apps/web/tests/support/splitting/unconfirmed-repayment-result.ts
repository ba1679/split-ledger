import { expect, type Page, type Request } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import {
  splittingMemberId,
  splittingTripId,
} from '../../../../api/tests/support/splitting/members-fixture.js';
import { callApi } from '../../../../api/tests/support/seed.js';
import { readBrowserSplittingSnapshot, type BrowserSplittingSnapshot } from './fixture.js';
import {
  repaymentDraftKey,
  repaymentWritesKey,
  type RepaymentDraft,
  type RepaymentBrowserWrite,
} from './repayment-draft.js';
import {
  lostRepaymentResponseKey,
  assertSavedIndependentRepayment,
  type LostRepaymentResponseState,
} from './lost-repayment-response.js';
import {
  independentRepaymentSaveKey,
  type IndependentRepaymentSave,
} from './save-independent-repayment.js';

import { expectedBalanceDisplay } from './member-balances-screen-result.js';

export const unconfirmedRepaymentPhrase = '保留還款草稿與原識別並提示結果尚未確認';

/** Temporary browser 404 is distinct from the server's committed original UUID. */
export function assertUnconfirmedRepaymentEvidence(
  action: IndependentRepaymentSave,
  loss: LostRepaymentResponseState,
  writes: RepaymentBrowserWrite[],
  tripId: string,
): void {
  expect(action.outcome).toBe('unconfirmed');
  expect(action.status).toBeNull();
  expect(action.response).toBeNull();
  expect(action.draft).toEqual(loss.draft);
  expect(action.draft).toMatchObject({ amount: '400', currencyCode: 'JPY', paidOn: '2027-03-12' });
  expect(action.draft.payerMemberId).not.toBe(action.draft.payeeMemberId);
  expect(loss.availability).toBe('temporary-not-found');
  expect(loss.failure).toBeUndefined();
  expect(loss.ids.commandId).toBe(action.draft.id);
  expect(loss.ids.repaymentId).toBe(action.draft.id);
  expect(action.payload).toEqual(action.draft);
  expect(action.before).toEqual(loss.before);
  expect(
    loss.authoritativeAfter,
    'A real POST committed before its response was lost',
  ).toBeDefined();
  expect(action.after).toEqual(loss.authoritativeAfter);
  expect(loss.savedResponse).toBeDefined();
  const expected = [
    { method: 'POST', path: `/api/trips/${tripId}/repayments`, body: action.draft },
  ];
  expect(writes).toEqual(expected);
  expect(loss.mutations).toEqual(expected);
  expect(loss.ids.mutationIds).toEqual([action.draft.id]);
  expect(
    loss.lookups.length,
    'The browser must attempt verification of the original UUID',
  ).toBeGreaterThan(0);
  for (const lookup of loss.lookups)
    expect(lookup).toEqual({ id: action.draft.id, actualStatus: 200, browserStatus: 404 });
  expect(loss.ids.lookupIds).toEqual(loss.lookups.map((lookup) => lookup.id));
}

async function assertRetainedRepaymentForm(
  page: Page,
  draft: RepaymentDraft,
  before: BrowserSplittingSnapshot,
): Promise<void> {
  const form = page
    .locator('form')
    .filter({ has: page.getByRole('button', { name: '儲存還款', exact: true }) });
  await expect(form).toHaveCount(1);
  await expect(form).toHaveAttribute('data-command-id', draft.id);
  await expect(form.getByRole('combobox', { name: '付款人', exact: true })).toHaveValue(
    draft.payerMemberId,
  );
  await expect(form.getByRole('combobox', { name: '收款人', exact: true })).toHaveValue(
    draft.payeeMemberId,
  );
  await expect(form.getByRole('combobox', { name: '幣別', exact: true })).toHaveValue(/^JPY\b/);
  await expect(form.getByLabel('金額', { exact: true })).toHaveValue('400');
  await expect(form.getByRole('textbox', { name: '還款日期', exact: true })).toHaveValue(
    '2027/03/12',
  );
  await expect(
    page.getByText(/尚無法確認|尚未確認|結果待確認|結果未明|無法確認.*(?:保存|儲存)/).first(),
  ).toBeVisible();
  const verify = page.getByRole('button', { name: /查看結果|查證|確認(?:保存|儲存)結果/ });
  await expect(verify).toHaveCount(1);
  await expect(verify).toBeVisible();
  await expect(verify).toBeEnabled();
  await expect(
    page
      .getByText(/還款已儲存|已儲存還款|還款已保存|還款成功|儲存成功|保存成功/)
      .filter({ visible: true }),
  ).toHaveCount(0);
  await expect(
    page
      .getByText(/^(?:還款未保存|還款未儲存|還款未寫入|儲存失敗|保存失敗|還款不存在)$/)
      .filter({ visible: true }),
  ).toHaveCount(0);
  const balances = page.getByRole('region', { name: '成員淨額', exact: true });
  if (await balances.isVisible()) {
    await expect(balances).toContainText(/舊資料|上次已確認|更新前|尚未更新/);
    for (const balance of before.settlement.balances) {
      const member = before.sources.members.find((row) => row.id === balance.memberId)!;
      const group = balances.getByRole('group', {
        name: `${String(member.name)} ${balance.currencyCode}`,
        exact: true,
      });
      await expect(
        group.getByText(expectedBalanceDisplay(balance.currencyCode, balance.netAmount), {
          exact: true,
        }),
      ).toBeVisible();
    }
  }
  const arrangements = page.getByRole('region', { name: '付款安排', exact: true });
  if (await arrangements.isVisible()) {
    await expect(arrangements).toContainText(/舊資料|上次已確認|更新前|尚未更新/);
    await expect(arrangements.getByText('JPY 1000', { exact: true })).toBeVisible();
    await expect(arrangements.getByText('JPY 600', { exact: true })).toHaveCount(0);
  }
}

/** Read-only Then: never restore routes, navigate, retry or press verification. */
export async function assertUnconfirmedRepayment(page: Page, world: LedgerWorld): Promise<void> {
  const action = world.get<IndependentRepaymentSave>(independentRepaymentSaveKey);
  const loss = world.get<LostRepaymentResponseState>(lostRepaymentResponseKey);
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
    await assertRetainedRepaymentForm(page, action.draft, loss.before);
    await expect.poll(() => loss.lookups.length, { timeout: 5000 }).toBeGreaterThan(0);
    assertUnconfirmedRepaymentEvidence(action, loss, world.get(repaymentWritesKey), tripId);
    expect(world.get<RepaymentDraft>(repaymentDraftKey)).toEqual(action.draft);
    expect(action.draft.payerMemberId).toBe(splittingMemberId(world, 'Amy'));
    expect(action.draft.payeeMemberId).toBe(splittingMemberId(world, 'Alice'));
    const current = await readBrowserSplittingSnapshot(world);
    expect(current).toEqual(loss.authoritativeAfter);
    assertSavedIndependentRepayment(
      loss.before,
      current,
      action.draft,
      loss.savedResponse!,
      tripId,
    );
    expect(current.repayments.items).toHaveLength(1);
    const detail = await callApi(
      world,
      'GET',
      `/api/trips/${tripId}/repayments/${action.draft.id}`,
    );
    expect(detail.status()).toBe(200);
    expect(await detail.json()).toEqual(loss.savedResponse);
    await assertRetainedRepaymentForm(page, action.draft, loss.before);
    assertUnconfirmedRepaymentEvidence(action, loss, world.get(repaymentWritesKey), tripId);
    expect(writes, 'Unknown outcome must not cause another write during Then').toEqual([]);
    expect(page.url()).toBe(originalUrl);
  } finally {
    world.response = originalResponse;
    page.off('request', capture);
  }
}
