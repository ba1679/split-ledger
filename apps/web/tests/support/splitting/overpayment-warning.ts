import { expect, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { callApi } from '../../../../api/tests/support/seed.js';
import { splittingTripId } from '../../../../api/tests/support/splitting/members-fixture.js';
import { independentSplittingOracle } from '../../../../api/tests/support/splitting/expense-fixture.js';
import type { OverpaymentFixtureConfirmation } from '../../../../api/tests/support/splitting/overpayment-warning-fixture.js';
import { readBrowserSplittingSnapshot, type BrowserSplittingSnapshot } from './fixture.js';
import {
  fillIndependentRepaymentDraft,
  repaymentDraftKey,
  repaymentBeforeKey,
  repaymentWritesKey,
  type RepaymentDraft,
  type RepaymentBrowserWrite,
} from './repayment-draft.js';

export const browserOverpaymentWarningPhrase = 'JPY 700 的超額 JPY 100 警告已呈現且尚未保存';

export const browserOverpaymentWarningKey = 'splitting:browserOverpaymentWarning';

export interface BrowserOverpaymentWarning {
  request: RepaymentDraft;
  confirmation: OverpaymentFixtureConfirmation;
  warning: { code: string; message: string; confirmation: OverpaymentFixtureConfirmation };
  before: BrowserSplittingSnapshot;
  warningPost: RepaymentBrowserWrite;
}

/** Verify the actual server warning without deriving expected amounts from UI strings. */
export function assertBrowserOverpaymentWarning(
  warning: BrowserOverpaymentWarning['warning'],
  request: RepaymentDraft,
  revision: string,
): void {
  expect(warning.code).toBe('OVERPAYMENT_CONFIRMATION_REQUIRED');
  expect(warning.message).toEqual(expect.any(String));
  expect(warning.message.length).toBeGreaterThan(0);
  expect(warning.confirmation).toMatchObject({
    accountingRevision: revision,
    reverseDebtorMemberId: request.payeeMemberId,
    reverseCreditorMemberId: request.payerMemberId,
    confirmationToken: expect.any(String),
  });
  expect(warning.confirmation.confirmationToken.length).toBeGreaterThan(0);
  expect(
    independentSplittingOracle.equal(warning.confirmation.excessAmount, {
      numerator: '100',
      denominator: '1',
      minorUnit: 0,
    }),
    'The server warning must describe exactly JPY 100 excess',
  ).toBe(true);
}

/** Prior submission is Arrange; leave the genuine warning pending for the scenario Act. */
export async function arrangeBrowserOverpaymentWarning(
  page: Page,
  world: LedgerWorld,
): Promise<void> {
  await fillIndependentRepaymentDraft(page, world, 'Alice', '700');
  const before = world.get<BrowserSplittingSnapshot>(repaymentBeforeKey);
  const request = structuredClone(world.get<RepaymentDraft>(repaymentDraftKey));
  expect(
    independentSplittingOracle.equal(
      independentSplittingOracle.balance(before.sources, request.payerMemberId, 'JPY'),
      { numerator: '-600', denominator: '1', minorUnit: 0 },
    ),
    'Given must start with Amy owing JPY 600',
  ).toBe(true);
  const path = `/api/trips/${splittingTripId(world)}/repayments`;
  const pending = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' && new URL(response.url()).pathname === path,
  );
  await page.getByRole('button', { name: '儲存還款', exact: true }).click();
  const response = await pending;
  expect(response.status(), 'Real UI submission must receive the product overpayment warning').toBe(
    409,
  );
  const sent = response.request().postDataJSON() as RepaymentDraft;
  expect(
    sent,
    'The warning submission must preserve the preallocated UUID and all payment fields',
  ).toEqual(request);
  const warning = (await response.json()) as BrowserOverpaymentWarning['warning'];
  assertBrowserOverpaymentWarning(warning, request, before.settlement.accountingRevision);
  await expect(page.getByText(/超額.*JPY\s*100/)).toBeVisible();
  await expect(page.getByText(/Alice.*(?:應付|支付).*Amy.*JPY\s*100/)).toBeVisible();
  await expect(page.getByRole('button', { name: /確認.*(?:還款|保存|儲存)/ })).toBeVisible();
  await expect(page.getByRole('button', { name: '取消', exact: true })).toBeVisible();
  const writes = world.get<RepaymentBrowserWrite[]>(repaymentWritesKey);
  expect(writes, 'Warning must not trigger a confirmation POST automatically').toEqual([
    { method: 'POST', path, body: request },
  ]);
  expect(
    await readBrowserSplittingSnapshot(world),
    'Warning must leave all sources and projections unchanged',
  ).toEqual(before);
  const detail = await callApi(world, 'GET', `${path}/${request.id}`);
  expect(detail.status(), 'No repayment may exist before explicit confirmation').toBe(404);
  const state: BrowserOverpaymentWarning = {
    request,
    warning: structuredClone(warning),
    confirmation: structuredClone(warning.confirmation),
    before,
    warningPost: structuredClone(writes[0]!),
  };
  world.set(browserOverpaymentWarningKey, state);
  world.set('splitting:overpaymentConfirmation', state.confirmation);
  world.set('splitting:overpaymentWarning', state.warning);
  world.set('splitting:warningSnapshot', before.sources);
  world.set('splitting:sourceSnapshot', before.sources);
  world.set('splitting:revision', before.settlement.accountingRevision);
  world.splitting.ids.repayments.set('pending', request.id);
}
