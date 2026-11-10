import { expect, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { callApi } from '../../../../api/tests/support/seed.js';
import {
  splittingMemberId,
  splittingTripId,
} from '../../../../api/tests/support/splitting/members-fixture.js';
import { snapshotSplittingSources } from '../../../../api/tests/support/splitting/expense-fixture.js';
import { historicalRepaymentProjection } from '../../../../api/tests/support/splitting/preserved-settlement-history.js';
import type { SourceSnapshot } from '../../../../api/tests/support/splitting/types.js';
import { browserSettledHistoryKey } from './settled-arrangement-fixture.js';
import { readBrowserSplittingSnapshot, type BrowserSplittingSnapshot } from './fixture.js';

export const preservedSettlementPaymentPhrase = '原結清與差額調整仍保留原值且實付仍顯示 JPY 33';

/** Compare complete immutable rows, including their IDs and original timestamps. */
export function assertUnchangedPaymentHistory(before: SourceSnapshot, after: SourceSnapshot): void {
  expect(before.settlements).toHaveLength(1);
  expect(before.repayments).toHaveLength(1);
  expect(before.adjustments).toHaveLength(2);
  for (const key of ['settlements', 'repayments', 'adjustments'] as const)
    expect(after[key], `Source correction must preserve every historical ${key} field`).toEqual(
      before[key],
    );
}

/** Independent projection from the saved Given rows, never from the current obligation. */
export function originalSettlementRecord(sources: SourceSnapshot) {
  const row = sources.settlements[0]!;

  return {
    id: row.id,
    tripId: row.trip_id,
    arrangementKey: row.arrangement_key,
    sourceRevision: String(row.source_revision),
    simplifyDebts: row.simplify_debts,
    debtorMemberId: row.debtor_member_id,
    creditorMemberId: row.creditor_member_id,
    currencyCode: row.currency_code,
    obligation: {
      numerator: String(row.obligation_numerator),
      denominator: String(row.obligation_denominator),
      minorUnit: Number(row.obligation_minor_unit),
    },
    repayment: historicalRepaymentProjection(sources.repayments[0]!),
    adjustments: sources.adjustments
      .map((adjustment) => ({
        memberId: adjustment.member_id,
        currencyCode: adjustment.currency_code,
        amount: {
          numerator: String(adjustment.numerator),
          denominator: String(adjustment.denominator),
          minorUnit: Number(adjustment.minor_unit),
        },
      }))
      .sort((a, b) => String(a.memberId).localeCompare(String(b.memberId))),
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : new Date(String(row.created_at)).toISOString(),
  };
}

export async function assertPreservedSettlementPayment(
  page: Page,
  world: LedgerWorld,
): Promise<void> {
  const history = world.get<BrowserSplittingSnapshot>(browserSettledHistoryKey);
  const after = await readBrowserSplittingSnapshot(world);
  assertUnchangedPaymentHistory(history.sources, after.sources);
  const original = originalSettlementRecord(history.sources);
  expect(original.obligation).toEqual({ numerator: '100', denominator: '3', minorUnit: 0 });
  expect(original.repayment).toMatchObject({
    payerMemberId: splittingMemberId(world, 'Amy'),
    payeeMemberId: splittingMemberId(world, 'Alice'),
    currencyCode: 'JPY',
    amount: '33',
    minorUnit: 0,
    paidOn: '2027-03-11',
    kind: 'settlement',
    settlementId: original.id,
  });
  expect(original.adjustments).toEqual(
    [
      {
        memberId: splittingMemberId(world, 'Amy'),
        currencyCode: 'JPY',
        amount: { numerator: '1', denominator: '3', minorUnit: 0 },
      },
      {
        memberId: splittingMemberId(world, 'Alice'),
        currencyCode: 'JPY',
        amount: { numerator: '-1', denominator: '3', minorUnit: 0 },
      },
    ].sort((a, b) => a.memberId.localeCompare(b.memberId)),
  );
  const base = `/api/trips/${splittingTripId(world)}`;
  const record = await callApi(world, 'GET', `${base}/settlements/${String(original.id)}`);
  expect(record.status(), 'Original settlement remains readable after source correction').toBe(200);
  const actual = await record.json();
  expect(Array.isArray(actual.adjustments)).toBe(true);
  actual.adjustments.sort((a: { memberId: string }, b: { memberId: string }) =>
    a.memberId.localeCompare(b.memberId),
  );
  expect(actual).toEqual(original);
  const payment = await callApi(
    world,
    'GET',
    `${base}/repayments/${String(original.repayment.id)}`,
  );
  expect(payment.status()).toBe(200);
  expect(await payment.json()).toEqual(original.repayment);
  expect(after.repayments.items).toEqual(history.repayments.items);
  // The preceding When already opened the refreshed settlement screen. Read its history,
  // without navigating or triggering another save/recalculation in this Then.
  const paymentRow = page
    .getByText(/Amy\s*(?:→|支付|付給)\s*Alice/)
    .locator('..')
    .filter({ hasText: /JPY\s*33(?![\d.])/ })
    .filter({ hasText: '2027-03-11' });
  await expect(paymentRow).toHaveCount(1);
  await expect(paymentRow).toBeVisible();
  await expect(paymentRow).toContainText(/JPY\s*33(?![\d.])/);
  await expect(paymentRow).toContainText('2027-03-11');
  expect(
    await snapshotSplittingSources(world),
    'Read-only history verification must not change any source',
  ).toEqual(after.sources);
}
