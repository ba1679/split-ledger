import { expect, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { callApi } from '../../../../api/tests/support/seed.js';
import { splittingTripId } from '../../../../api/tests/support/splitting/members-fixture.js';
import { readBrowserSplittingSnapshot, type BrowserSplittingSnapshot } from './fixture.js';
import {
  repaymentDraftKey,
  repaymentBeforeKey,
  repaymentWritesKey,
  type RepaymentDraft,
  type RepaymentBrowserWrite,
} from './repayment-draft.js';
import {
  independentRepaymentSaveKey,
  type IndependentRepaymentSave,
} from './save-independent-repayment.js';

export const sameRepaymentPartiesResultPhrase = '還款欄提示付款人與收款人不可相同且帳務不變';

/** A validation outcome must be definite and preserve every source and projection. */
export function assertRejectedRepaymentEvidence(
  action: IndependentRepaymentSave,
  draft: RepaymentDraft,
  before: BrowserSplittingSnapshot,
  writes: RepaymentBrowserWrite[],
  tripId: string,
): void {
  expect(action.draft).toEqual(draft);
  expect(action.before).toEqual(before);
  expect(action.after).toEqual(before);
  expect(['local-validation', 'rejected']).toContain(action.outcome);
  if (action.outcome === 'local-validation') {
    expect(action.status).toBeNull();
    expect(action.response).toBeNull();
    expect(action.payload).toBeNull();
    expect(writes).toEqual([]);
  } else {
    expect(action.status).toBeGreaterThanOrEqual(400);
    expect(action.status).toBeLessThan(500);
    expect(action.payload).toEqual(draft);
    expect(writes).toEqual([
      { method: 'POST', path: `/api/trips/${tripId}/repayments`, body: draft },
    ]);
  }
  expect(before.repayments.items.some((item) => item.id === draft.id)).toBe(false);
  expect(before.sources.repayments.some((item) => item.id === draft.id)).toBe(false);
}

/** Shared read-only field check; observing a failure never edits or resubmits its draft. */
export async function assertRepaymentFieldValidation(
  page: Page,
  world: LedgerWorld,
  field: 'parties' | 'amount',
): Promise<void> {
  const draft = world.get<RepaymentDraft>(repaymentDraftKey);
  const before = world.get<BrowserSplittingSnapshot>(repaymentBeforeKey);
  const action = world.get<IndependentRepaymentSave>(independentRepaymentSaveKey);
  const tripId = splittingTripId(world);
  const originalResponse = world.response;
  const originalUrl = page.url();
  const writes = structuredClone(world.get<RepaymentBrowserWrite[]>(repaymentWritesKey));
  try {
    if (field === 'parties') expect(draft.payerMemberId).toBe(draft.payeeMemberId);
    else expect(draft.amount).toBe('0');
    assertRejectedRepaymentEvidence(action, draft, before, writes, tripId);
    await expect(page).toHaveURL(new RegExp(`/trips/${tripId}/repayments/new/?$`));
    const form = page.locator('form').filter({
      has: page.getByRole('button', { name: '儲存還款', exact: true }),
    });
    await expect(form).toHaveCount(1);
    await expect(form).toHaveAttribute('data-command-id', draft.id);
    await expect(form.getByRole('combobox', { name: '付款人', exact: true })).toHaveValue(
      draft.payerMemberId,
    );
    await expect(form.getByRole('combobox', { name: '收款人', exact: true })).toHaveValue(
      draft.payeeMemberId,
    );
    await expect(form.getByRole('combobox', { name: '幣別', exact: true })).toHaveValue(/^JPY\b/);
    await expect(form.getByLabel('金額', { exact: true })).toHaveValue(draft.amount);
    await expect(form.getByRole('textbox', { name: '還款日期', exact: true })).toHaveValue(
      draft.paidOn.replaceAll('-', '/'),
    );
    const message =
      field === 'parties'
        ? /(?:付款人.*收款人|收款人.*付款人).*(?:不可|不能|不得|不可以)相同|(?:付款人.*收款人|收款人.*付款人).*必須不同/
        : /金額.*(?:正數|大於\s*0)|(?:請|必須).*輸入.*正數/;
    await expect(
      form.getByText(message).first(),
      'Readable field correction must remain visible',
    ).toBeVisible();
    await expect(
      page
        .getByText(/還款已儲存|已儲存還款|還款已保存|還款成功|儲存成功|保存成功/)
        .filter({ visible: true }),
    ).toHaveCount(0);
    expect(
      await readBrowserSplittingSnapshot(world),
      'Validation preserves repayments, settlement, adjustments and all original sources',
    ).toEqual(before);
    const detail = await callApi(world, 'GET', `/api/trips/${tripId}/repayments/${draft.id}`);
    expect(detail.status(), 'Invalid draft must never have a saved repayment').toBe(404);
    expect(world.get<RepaymentDraft>(repaymentDraftKey)).toEqual(draft);
    expect(world.get<RepaymentBrowserWrite[]>(repaymentWritesKey)).toEqual(writes);
    expect(page.url()).toBe(originalUrl);
  } finally {
    world.response = originalResponse;
  }
}
