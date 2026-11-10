import { expect, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { callApi } from '../../../../api/tests/support/seed.js';
import { splittingTripId } from '../../../../api/tests/support/splitting/members-fixture.js';
import { independentSplittingOracle } from '../../../../api/tests/support/splitting/expense-fixture.js';
import { readBrowserSplittingSnapshot, type BrowserSplittingSnapshot } from './fixture.js';
import { settlementSaveKey, type BrowserSettlementSave } from './save-settlement.js';
import {
  settlementFormKey,
  settlementWritesKey,
  type BrowserSettlementDraft,
} from './settlement-form.js';
import { staleSettlementFormKey } from './stale-settlement-form.js';
import type { RepaymentBrowserWrite } from './repayment-draft.js';

export const staleSettlementRejectedPhrase = '提示安排已更新並要求刷新且沒有本次實付或結清';

export function assertStaleSettlementAuthority(
  draft: BrowserSettlementDraft,
  corrected: BrowserSplittingSnapshot,
  saved: BrowserSettlementSave,
  current: BrowserSplittingSnapshot,
  writes: RepaymentBrowserWrite[],
  tripId: string,
): void {
  expect(saved.outcome).toBe('rejected');
  expect(saved.status).toBe(409);
  expect(['ACCOUNTING_REVISION_CONFLICT', 'ARRANGEMENT_NOT_FOUND']).toContain(
    (saved.response as { code?: unknown } | null)?.code,
  );
  expect(saved.command).toEqual({ ...draft, paidAmount: '33' });
  expect(saved.payload).toEqual(saved.command);
  expect(draft.expectedAmount).toEqual({ numerator: '100', denominator: '3', minorUnit: 0 });
  expect(BigInt(corrected.settlement.accountingRevision)).toBeGreaterThan(
    BigInt(draft.accountingRevision),
  );
  expect(saved.before, 'The rejection baseline is the other device’s current authority').toEqual(
    corrected,
  );
  expect(saved.after).toEqual(corrected);
  expect(
    current,
    'A stale rejection must preserve the corrected sources and all projections',
  ).toEqual(corrected);
  expect(
    writes,
    'Only the original stale command may be submitted; no automatic replacement',
  ).toEqual([{ method: 'POST', path: `/api/trips/${tripId}/settlements`, body: saved.command }]);
  const arrangements = current.settlement.arrangements.filter(
    (row) =>
      row.debtorMemberId === draft.debtorMemberId &&
      row.creditorMemberId === draft.creditorMemberId &&
      row.currencyCode === draft.currencyCode,
  );
  expect(arrangements, 'The corrected arrangement must remain outstanding').toHaveLength(1);
  expect(arrangements[0]!.key).not.toBe(draft.arrangementKey);
  expect(
    independentSplittingOracle.equal(arrangements[0]!.amount, {
      numerator: '200',
      denominator: '3',
      minorUnit: 0,
    }),
  ).toBe(true);
  expect(current.sources.settlements.some((row) => row.id === draft.id)).toBe(false);
  expect(current.sources.repayments.some((row) => row.id === draft.repaymentId)).toBe(false);
}

/** Verify the expired state and available refresh action without invoking it. */
export async function assertStaleSettlementRejected(page: Page, world: LedgerWorld): Promise<void> {
  const draft = world.get<BrowserSettlementDraft>(settlementFormKey);
  const stale = world.get<{ original: BrowserSettlementDraft; after: BrowserSplittingSnapshot }>(
    staleSettlementFormKey,
  );
  const saved = world.get<BrowserSettlementSave>(settlementSaveKey);
  const originalResponse = world.response;
  const originalUrl = page.url();
  try {
    expect(draft).toEqual(stale.original);
    const message = page
      .locator('[role="alert"], [role="status"]')
      .filter({ hasText: /安排.*(?:已更新|過期)|(?:已更新|過期).*安排/ });
    await expect(
      message.first(),
      'The stale API code must map to an understandable arrangement update',
    ).toBeVisible();
    await expect(message.first()).toContainText(/刷新|重新載入|重新整理/);
    const refresh = page
      .getByRole('button', { name: /刷新|重新載入|重新整理/ })
      .or(page.getByRole('link', { name: /刷新|重新載入|重新整理/ }));
    await expect(refresh.first()).toBeVisible();
    await expect(refresh.first()).toBeEnabled();
    await expect(
      page.getByText(/結清成功|已結清|結清已儲存|結清已保存/).filter({ visible: true }),
    ).toHaveCount(0);
    const tripId = splittingTripId(world);
    const current = await readBrowserSplittingSnapshot(world);
    assertStaleSettlementAuthority(
      draft,
      stale.after,
      saved,
      current,
      world.get(settlementWritesKey),
      tripId,
    );
    for (const [collection, id] of [
      ['settlements', draft.id],
      ['repayments', draft.repaymentId],
    ]) {
      const response = await callApi(world, 'GET', `/api/trips/${tripId}/${collection}/${id}`);
      expect(response.status(), 'The stale reserved UUID must have no persisted fact').toBe(404);
    }
    expect(await readBrowserSplittingSnapshot(world)).toEqual(current);
    expect(world.get<RepaymentBrowserWrite[]>(settlementWritesKey)).toEqual([
      { method: 'POST', path: `/api/trips/${tripId}/settlements`, body: saved.command },
    ]);
    expect(page.url(), 'This Then must not trigger the offered refresh').toBe(originalUrl);
  } finally {
    world.response = originalResponse;
  }
}
