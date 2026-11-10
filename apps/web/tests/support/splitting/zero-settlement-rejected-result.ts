import { expect, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { callApi } from '../../../../api/tests/support/seed.js';
import { splittingTripId } from '../../../../api/tests/support/splitting/members-fixture.js';
import { readBrowserSplittingSnapshot, type BrowserSplittingSnapshot } from './fixture.js';
import { settlementSaveKey, type BrowserSettlementSave } from './save-settlement.js';
import {
  SettlementPaymentForm,
  settlementFormKey,
  settlementWritesKey,
  type BrowserSettlementDraft,
} from './settlement-form.js';
import type { RepaymentBrowserWrite } from './repayment-draft.js';

export const zeroSettlementRejectedPhrase = '實付欄提示正數且安排未結清';

/** Check the whole authority, not only the arrangement's formatted amount. */
export function assertZeroSettlementAuthority(
  draft: BrowserSettlementDraft,
  saved: BrowserSettlementSave,
  current: BrowserSplittingSnapshot,
): void {
  expect(saved.command).toEqual({ ...draft, paidAmount: '0' });
  expect(['local-validation', 'rejected']).toContain(saved.outcome);
  if (saved.outcome === 'rejected') {
    expect(saved.status).toBeGreaterThanOrEqual(400);
    expect(saved.status).toBeLessThan(500);
  } else {
    expect(saved.status).toBeNull();
    expect(saved.payload).toBeNull();
  }
  expect(draft.expectedAmount).toEqual({ numerator: '100', denominator: '3', minorUnit: 0 });
  expect(saved.after).toEqual(saved.before);
  expect(current).toEqual(saved.before);
  const arrangements = current.settlement.arrangements.filter(
    (arrangement) => arrangement.key === draft.arrangementKey,
  );
  expect(arrangements).toHaveLength(1);
  expect(arrangements[0]).toEqual({
    key: draft.arrangementKey,
    debtorMemberId: draft.debtorMemberId,
    creditorMemberId: draft.creditorMemberId,
    currencyCode: draft.currencyCode,
    amount: draft.expectedAmount,
  });
  expect(current.settlement.accountingRevision).toBe(draft.accountingRevision);
}

/** Then is read-only: no navigation, submission, refresh or draft repair. */
export async function assertZeroSettlementRejected(page: Page, world: LedgerWorld): Promise<void> {
  const draft = world.get<BrowserSettlementDraft>(settlementFormKey);
  const saved = world.get<BrowserSettlementSave>(settlementSaveKey);
  const form = new SettlementPaymentForm(page);
  await expect(form.paidAmount).toBeVisible();
  await expect(form.paidAmount).toHaveValue('0');
  const commandForm = page.locator('form').filter({ has: form.paidAmount });
  const error = commandForm
    .locator('[role="alert"], [role="status"], .error')
    .filter({ hasText: /正數|大於\s*0/ });
  await expect(
    error.first(),
    'The payment form must explain the positive amount requirement',
  ).toBeVisible();
  await expect(
    form.paidAmount,
    'The payment error must identify its invalid field',
  ).toHaveAttribute('aria-invalid', 'true');
  await expect(
    page.getByRole('status').filter({ hasText: /結清成功|已結清|結清已儲存|結清已保存/ }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('alert').filter({ hasText: /結清成功|已結清|結清已儲存|結清已保存/ }),
  ).toHaveCount(0);
  await expect(
    page.getByText(/結清成功|已結清|結清已儲存|結清已保存/).first(),
    'No visible success message may contradict the rejected zero payment',
  ).not.toBeVisible();
  const tripId = splittingTripId(world);
  const current = await readBrowserSplittingSnapshot(world);
  assertZeroSettlementAuthority(draft, saved, current);
  for (const [collection, id] of [
    ['settlements', draft.id],
    ['repayments', draft.repaymentId],
  ]) {
    const response = await callApi(world, 'GET', `/api/trips/${tripId}/${collection}/${id}`);
    expect(response.status(), 'Neither reserved command may have been saved').toBe(404);
  }
  expect(world.get<RepaymentBrowserWrite[]>(settlementWritesKey)).toEqual(
    saved.outcome === 'rejected'
      ? [{ method: 'POST', path: `/api/trips/${tripId}/settlements`, body: saved.command }]
      : [],
  );
  expect(
    await readBrowserSplittingSnapshot(world),
    'Read-only verification must preserve every source and projection',
  ).toEqual(current);
}
