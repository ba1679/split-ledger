import { expect, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { callApi } from '../../../../api/tests/support/seed.js';
import { splittingTripId } from '../../../../api/tests/support/splitting/members-fixture.js';
import { readBrowserSplittingSnapshot, type BrowserSplittingSnapshot } from './fixture.js';
import { cancelledOverpaymentKey, type CancelledOverpayment } from './cancel-overpayment.js';
import { assertPendingOverpaymentEvidence } from './pending-overpayment-result.js';
import { repaymentWritesKey, type RepaymentBrowserWrite } from './repayment-draft.js';

export const cancelledOverpaymentResultPhrase = '沒有新增還款且 Amy 仍應付 Alice JPY 600';

/** Cancellation preserves the original warning's entire authority and original command. */
export function assertCancelledOverpaymentEvidence(
  action: CancelledOverpayment,
  current: BrowserSplittingSnapshot,
  writes: RepaymentBrowserWrite[],
  tripId: string,
): void {
  const { warning } = action;
  expect(action.writesBefore).toEqual([warning.warningPost]);
  expect(action.writesAfter).toEqual(action.writesBefore);
  expect(writes).toEqual(action.writesBefore);
  assertPendingOverpaymentEvidence(
    warning.request,
    warning.warning,
    warning.before,
    current,
    writes,
    tripId,
  );
}

/** Read-only Then: never clicks, confirms, retries, or changes the draft UUID. */
export async function assertCancelledOverpayment(page: Page, world: LedgerWorld): Promise<void> {
  const action = world.get<CancelledOverpayment>(cancelledOverpaymentKey);
  expect(action, 'Cancellation must have actual When evidence').toBeDefined();
  const { warning } = action;
  const originalResponse = world.response;
  try {
    await expect(page.getByRole('button', { name: /確認.*(?:還款|保存|儲存)/ })).toBeHidden();
    await expect(page.getByText(/超額.*JPY\s*100/)).toBeHidden();
    await expect(
      page
        .getByText(/還款已儲存|已儲存還款|還款已保存|還款成功|儲存成功|保存成功/)
        .filter({ visible: true }),
    ).toHaveCount(0);
    expect(
      warning.before.sources.members.find((row) => row.id === warning.request.payerMemberId)?.name,
    ).toBe('Amy');
    expect(
      warning.before.sources.members.find((row) => row.id === warning.request.payeeMemberId)?.name,
    ).toBe('Alice');
    const tripId = splittingTripId(world);
    const current = await readBrowserSplittingSnapshot(world);
    assertCancelledOverpaymentEvidence(action, current, world.get(repaymentWritesKey), tripId);
    const detail = await callApi(
      world,
      'GET',
      `/api/trips/${tripId}/repayments/${warning.request.id}`,
    );
    expect(detail.status(), 'Cancelled command must never have created a repayment').toBe(404);
    expect(await readBrowserSplittingSnapshot(world)).toEqual(warning.before);
    expect(world.get<RepaymentBrowserWrite[]>(repaymentWritesKey)).toEqual([warning.warningPost]);
  } finally {
    world.response = originalResponse;
  }
}
