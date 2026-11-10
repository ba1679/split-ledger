import { expect, type Page, type Request } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { callApi } from '../../../../api/tests/support/seed.js';
import { splittingTripId } from '../../../../api/tests/support/splitting/members-fixture.js';
import { independentSplittingOracle } from '../../../../api/tests/support/splitting/expense-fixture.js';
import { readBrowserSplittingSnapshot, type BrowserSplittingSnapshot } from './fixture.js';
import {
  assertBrowserOverpaymentWarning,
  browserOverpaymentWarningKey,
  type BrowserOverpaymentWarning,
} from './overpayment-warning.js';
import {
  repaymentDraftKey,
  repaymentWritesKey,
  type RepaymentDraft,
  type RepaymentBrowserWrite,
} from './repayment-draft.js';
import {
  independentRepaymentSaveKey,
  type IndependentRepaymentSave,
} from './save-independent-repayment.js';

export const pendingOverpaymentPhrase = '提示超額 JPY 100 將使 Alice 應付 Amy JPY 100 且尚未保存';

/** Compare the true 409 response and complete pre-warning authority; no confirmation Act. */
export function assertPendingOverpaymentEvidence(
  request: RepaymentDraft,
  warning: BrowserOverpaymentWarning['warning'],
  before: BrowserSplittingSnapshot,
  current: BrowserSplittingSnapshot,
  writes: RepaymentBrowserWrite[],
  tripId: string,
): void {
  expect(request).toMatchObject({ amount: '700', currencyCode: 'JPY', paidOn: '2027-03-12' });
  expect(request.payerMemberId).not.toBe(request.payeeMemberId);
  assertBrowserOverpaymentWarning(warning, request, before.settlement.accountingRevision);
  expect(
    current,
    'Pending warning must preserve all source rows, historical payments and projections',
  ).toEqual(before);
  expect(current.repayments.items.some((row) => row.id === request.id)).toBe(false);
  expect(current.sources.repayments.some((row) => row.id === request.id)).toBe(false);
  expect(writes, 'No automatic confirmation or replacement command may follow the warning').toEqual(
    [{ method: 'POST', path: `/api/trips/${tripId}/repayments`, body: request }],
  );
  expect(current.settlement.arrangements).toHaveLength(2);
  for (const [currencyCode, amount] of [
    ['JPY', '600'],
    ['TWD', '300'],
  ] as const) {
    const arrangements = current.settlement.arrangements.filter(
      (row) => row.currencyCode === currencyCode,
    );
    expect(arrangements).toHaveLength(1);
    expect(arrangements[0]).toMatchObject({
      debtorMemberId: request.payerMemberId,
      creditorMemberId: request.payeeMemberId,
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

export async function assertPendingOverpayment(page: Page, world: LedgerWorld): Promise<void> {
  const action = world.state.get(independentRepaymentSaveKey) as
    IndependentRepaymentSave | undefined;
  const arranged = world.state.get(browserOverpaymentWarningKey) as
    BrowserOverpaymentWarning | undefined;
  expect(action ?? arranged, 'Warning needs a captured real browser submission').toBeDefined();
  if (action) {
    expect(action.outcome).toBe('warning');
    expect(action.status).toBe(409);
    expect(action.payload).toEqual(action.draft);
    expect(action.after).toEqual(action.before);
  }
  const request = action?.draft ?? arranged!.request;
  const warning = (action?.response ?? arranged!.warning) as BrowserOverpaymentWarning['warning'];
  const before = action?.before ?? arranged!.before;
  const tripId = splittingTripId(world);
  expect(world.get<RepaymentDraft>(repaymentDraftKey)).toEqual(request);
  expect(before.sources.members.find((row) => row.id === request.payerMemberId)?.name).toBe('Amy');
  expect(before.sources.members.find((row) => row.id === request.payeeMemberId)?.name).toBe(
    'Alice',
  );
  const originalResponse = world.response;
  const originalUrl = page.url();
  const writes: string[] = [];
  const capture = (networkRequest: Request) => {
    if (
      new URL(networkRequest.url()).pathname.startsWith('/api/') &&
      ['POST', 'PATCH', 'PUT', 'DELETE'].includes(networkRequest.method())
    )
      writes.push(`${networkRequest.method()} ${new URL(networkRequest.url()).pathname}`);
  };
  page.on('request', capture);
  try {
    await expect(page.getByText(/超額.*JPY\s*100/).first()).toBeVisible();
    await expect(page.getByText(/Alice.*(?:應付|支付).*Amy.*JPY\s*100/).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /確認.*(?:還款|保存|儲存)/ })).toBeVisible();
    await expect(page.getByRole('button', { name: '取消', exact: true })).toBeVisible();
    await expect(
      page
        .getByText(/還款已儲存|已儲存還款|還款已保存|還款成功|儲存成功|保存成功/)
        .filter({ visible: true }),
    ).toHaveCount(0);
    const current = await readBrowserSplittingSnapshot(world);
    assertPendingOverpaymentEvidence(
      request,
      warning,
      before,
      current,
      world.get(repaymentWritesKey),
      tripId,
    );
    const detail = await callApi(world, 'GET', `/api/trips/${tripId}/repayments/${request.id}`);
    expect(detail.status(), 'The reserved command must still have no saved repayment').toBe(404);
    expect(await readBrowserSplittingSnapshot(world)).toEqual(before);
    expect(world.get<RepaymentBrowserWrite[]>(repaymentWritesKey)).toEqual([
      { method: 'POST', path: `/api/trips/${tripId}/repayments`, body: request },
    ]);
    expect(writes, 'Then must not confirm, cancel or initiate any new write').toEqual([]);
    expect(page.url()).toBe(originalUrl);
  } finally {
    world.response = originalResponse;
    page.off('request', capture);
  }
}
