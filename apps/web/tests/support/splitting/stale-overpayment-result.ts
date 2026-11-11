import { expect, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { callApi } from '../../../../api/tests/support/seed.js';
import { splittingTripId } from '../../../../api/tests/support/splitting/members-fixture.js';
import { independentSplittingOracle } from '../../../../api/tests/support/splitting/expense-fixture.js';
import { readBrowserSplittingSnapshot, type BrowserSplittingSnapshot } from './fixture.js';
import {
  assertOriginalOverpaymentConfirmation,
  confirmedOverpaymentKey,
  type ConfirmedOverpayment,
} from './confirm-overpayment.js';
import {
  repaymentDraftKey,
  repaymentWritesKey,
  type RepaymentBrowserWrite,
} from './repayment-draft.js';
import { staleBrowserWarningKey } from './stale-overpayment-warning.js';

export const staleOverpaymentResultPhrase = '顯示新的超額 JPY 200 警告且未保存舊確認';

/** The only optional extra POST is the app's unconfirmed refresh of the same command. */
export function assertStaleOverpaymentEvidence(
  action: ConfirmedOverpayment,
  corrected: BrowserSplittingSnapshot,
  current: BrowserSplittingSnapshot,
  writes: RepaymentBrowserWrite[],
  tripId: string,
): void {
  expect(action.status).toBe(409);
  expect(action.response).toMatchObject({ code: 'ACCOUNTING_REVISION_CONFLICT' });
  assertOriginalOverpaymentConfirmation(action.payload, action.original);
  expect(action.before).toEqual(corrected);
  expect(corrected.settlement.accountingRevision).not.toBe(
    action.original.confirmation.accountingRevision,
  );
  expect(current, 'Stale confirmation and new warning must not save any accounting facts').toEqual(
    corrected,
  );
  expect(current.sources.settlements).toEqual([]);
  expect(current.sources.adjustments).toEqual([]);
  expect(current.repayments.items.some((row) => row.id === action.original.request.id)).toBe(false);
  const path = `/api/trips/${tripId}/repayments`;
  expect([2, 3]).toContain(writes.length);
  expect(writes.slice(0, 2)).toEqual([
    action.original.warningPost,
    { method: 'POST', path, body: action.payload },
  ]);
  if (writes.length === 3)
    expect(
      writes[2],
      'Recovery must omit the expired confirmation and retain the original UUID',
    ).toEqual({
      method: 'POST',
      path,
      body: action.original.request,
    });
  expect(current.settlement.arrangements).toHaveLength(2);
  for (const [currencyCode, amount] of [
    ['JPY', '500'],
    ['TWD', '300'],
  ] as const) {
    const arrangements = current.settlement.arrangements.filter(
      (row) => row.currencyCode === currencyCode,
    );
    expect(arrangements).toHaveLength(1);
    expect(arrangements[0]).toMatchObject({
      debtorMemberId: action.original.request.payerMemberId,
      creditorMemberId: action.original.request.payeeMemberId,
    });
    expect(
      independentSplittingOracle.equal(arrangements[0]!.amount, {
        numerator: amount,
        denominator: '1',
        minorUnit: 0,
      }),
    ).toBe(true);
  }
}

/** Observe the new pending warning and read authority; never perform a second confirmation. */
export async function assertStaleOverpaymentResult(page: Page, world: LedgerWorld): Promise<void> {
  const action = world.get<ConfirmedOverpayment>(confirmedOverpaymentKey);
  const stale = world.get<{ after: BrowserSplittingSnapshot }>(staleBrowserWarningKey);
  const originalResponse = world.response;
  const originalUrl = page.url();
  try {
    await expect(page.getByText(/超額.*JPY\s*200(?:\D|$)/).first()).toBeVisible();
    await expect(
      page.getByText(/Alice.*(?:應付|支付).*Amy.*JPY\s*200(?:\D|$)/).first(),
    ).toBeVisible();
    await expect(page.getByText(/(?:餘額|應付|尚欠).*JPY\s*500(?:\D|$)/).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /確認.*(?:還款|保存|儲存)/ })).toBeVisible();
    await expect(page.getByRole('button', { name: '取消', exact: true })).toBeVisible();
    await expect(page.getByText(/超額.*JPY\s*100(?:\D|$)/).filter({ visible: true })).toHaveCount(
      0,
    );
    await expect(
      page
        .getByText(/還款已儲存|已儲存還款|還款已保存|還款成功|儲存成功|保存成功/)
        .filter({ visible: true }),
    ).toHaveCount(0);
    const form = page
      .locator('form')
      .filter({ has: page.getByRole('button', { name: '儲存還款', exact: true }) });
    await expect(form).toHaveAttribute('data-command-id', action.original.request.id);
    await expect(page.getByRole('combobox', { name: '付款人', exact: true })).toHaveValue(
      action.original.request.payerMemberId,
    );
    await expect(page.getByRole('combobox', { name: '收款人', exact: true })).toHaveValue(
      action.original.request.payeeMemberId,
    );
    await expect(page.getByLabel('金額', { exact: true })).toHaveValue('700');
    await expect(page.getByRole('textbox', { name: '還款日期', exact: true })).toHaveValue(
      '2027/03/12',
    );
    expect(world.get(repaymentDraftKey)).toEqual(action.original.request);
    const detail = await callApi(
      world,
      'GET',
      `/api/trips/${splittingTripId(world)}/repayments/${action.original.request.id}`,
    );
    expect(detail.status(), 'The original UUID must still have no saved repayment').toBe(404);
    const current = await readBrowserSplittingSnapshot(world);
    assertStaleOverpaymentEvidence(
      action,
      stale.after,
      current,
      world.get(repaymentWritesKey),
      splittingTripId(world),
    );
    expect(page.url()).toBe(originalUrl);
  } finally {
    world.response = originalResponse;
  }
}
