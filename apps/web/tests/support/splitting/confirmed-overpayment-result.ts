import { expect, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { callApi } from '../../../../api/tests/support/seed.js';
import {
  splittingMemberId,
  splittingTripId,
} from '../../../../api/tests/support/splitting/members-fixture.js';
import { historicalRepaymentProjection } from '../../../../api/tests/support/splitting/preserved-settlement-history.js';
import { independentSplittingOracle } from '../../../../api/tests/support/splitting/expense-fixture.js';
import { assertExactArrangementSet } from '../../../../api/tests/support/splitting/expense-arrangements-result.js';
import {
  readBrowserSplittingSnapshot,
  assertBrowserSettlementBalances,
  type BrowserSplittingSnapshot,
} from './fixture.js';
import { assertSavedIndependentRepayment } from './lost-repayment-response.js';
import {
  confirmedOverpaymentKey,
  assertOriginalOverpaymentConfirmation,
  type ConfirmedOverpayment,
} from './confirm-overpayment.js';
import {
  repaymentWritesKey,
  type RepaymentDraft,
  type RepaymentBrowserWrite,
} from './repayment-draft.js';

export const confirmedOverpaymentResultPhrase =
  '已保存 JPY 700 獨立實付且 Alice 改為應付 Amy JPY 100';

/** The surplus remains a reverse cash obligation, never a settlement adjustment. */
export function assertConfirmedOverpaymentSources(
  before: BrowserSplittingSnapshot,
  after: BrowserSplittingSnapshot,
  draft: RepaymentDraft,
  saved: Record<string, unknown>,
  tripId: string,
  alice: string,
  amy: string,
): Record<string, unknown>[] {
  expect(draft).toEqual({
    id: draft.id,
    payerMemberId: amy,
    payeeMemberId: alice,
    currencyCode: 'JPY',
    amount: '700',
    paidOn: '2027-03-12',
  });
  expect(before.sources.repayments).toHaveLength(1);
  const first = historicalRepaymentProjection(before.sources.repayments[0]!);
  expect(first).toMatchObject({
    payerMemberId: amy,
    payeeMemberId: alice,
    amount: '400',
    currencyCode: 'JPY',
    minorUnit: 0,
    paidOn: draft.paidOn,
    kind: 'independent',
    settlementId: null,
  });
  expect(first.id).not.toBe(draft.id);
  expect(before.repayments.items).toEqual([first]);
  expect(before.sources.settlements).toEqual([]);
  expect(before.sources.adjustments).toEqual([]);
  assertSavedIndependentRepayment(before, after, draft, saved, tripId);
  const records = after.sources.repayments.map(historicalRepaymentProjection);
  expect(records).toHaveLength(2);
  expect(records.find((row) => row.id === first.id)).toEqual(first);
  expect(records.find((row) => row.id === draft.id)).toEqual(saved);
  expect(after.repayments.items).toHaveLength(2);
  for (const record of records)
    expect(after.repayments.items.find((row) => row.id === record.id)).toEqual(record);
  for (const [snapshot, jpy] of [
    [before, '600'],
    [after, '-100'],
  ] as const) {
    assertBrowserSettlementBalances(snapshot.sources, snapshot.settlement.balances);
    for (const [member, sign] of [
      [alice, 1n],
      [amy, -1n],
    ] as const)
      for (const [currency, amount] of [
        ['JPY', jpy],
        ['TWD', '300'],
      ] as const)
        expect(
          independentSplittingOracle.equal(
            independentSplittingOracle.balance(snapshot.sources, member, currency),
            { numerator: (BigInt(amount) * sign).toString(), denominator: '1', minorUnit: 0 },
          ),
        ).toBe(true);
  }
  assertExactArrangementSet(after.settlement.arrangements, [
    {
      debtorMemberId: alice,
      creditorMemberId: amy,
      currencyCode: 'JPY',
      amount: { numerator: '100', denominator: '1', minorUnit: 0 },
    },
    {
      debtorMemberId: amy,
      creditorMemberId: alice,
      currencyCode: 'TWD',
      amount: { numerator: '300', denominator: '1', minorUnit: 0 },
    },
  ]);

  return records;
}

/** Inspect only the existing success screen and read-only authority resources. */
export async function assertConfirmedOverpaymentScreen(
  page: Page,
  world: LedgerWorld,
): Promise<void> {
  const confirmation = world.get<ConfirmedOverpayment>(confirmedOverpaymentKey);
  expect(confirmation.status).toBe(201);
  expect(confirmation.before).toEqual(confirmation.original.before);
  assertOriginalOverpaymentConfirmation(confirmation.payload, confirmation.original);
  const draft = confirmation.original.request;
  const tripId = splittingTripId(world);
  expect(confirmation.writes).toEqual([
    confirmation.original.warningPost,
    { method: 'POST', path: `/api/trips/${tripId}/repayments`, body: confirmation.payload },
  ]);
  expect(
    world.get<RepaymentBrowserWrite[]>(repaymentWritesKey),
    'No automatic second confirmation may follow the successful Act',
  ).toEqual(confirmation.writes);
  const after = await readBrowserSplittingSnapshot(world);
  const records = assertConfirmedOverpaymentSources(
    confirmation.before,
    after,
    draft,
    confirmation.response as Record<string, unknown>,
    tripId,
    splittingMemberId(world, 'Alice'),
    splittingMemberId(world, 'Amy'),
  );
  for (const record of records) {
    const detail = await callApi(
      world,
      'GET',
      `/api/trips/${tripId}/repayments/${String(record.id)}`,
    );
    expect(detail.status(), 'Original cash-fact UUID must remain readable').toBe(200);
    expect(await detail.json()).toEqual(record);
  }
  await expect(
    page.getByText(/還款已儲存|已儲存還款|還款已保存|還款成功|儲存成功|保存成功/).first(),
  ).toBeVisible();
  const arrangements = page.getByRole('region', { name: '付款安排', exact: true });
  await expect(arrangements.getByRole('group')).toHaveCount(2);
  for (const [label, amount] of [
    ['Alice 付款給 Amy JPY', 'JPY 100'],
    ['Amy 付款給 Alice TWD', 'TWD 300'],
  ] as const) {
    const row = arrangements.getByRole('group', { name: label, exact: true });
    await expect(row).toBeVisible();
    await expect(row.getByText(amount, { exact: true })).toBeVisible();
  }
  const history = page.getByRole('list', { name: '還款紀錄', exact: true });
  await expect(history.getByRole('listitem')).toHaveCount(2);
  for (const amount of ['400', '700']) {
    const row = history
      .getByRole('listitem')
      .filter({ hasText: new RegExp(`JPY\\s*${amount}(?:\\D|$)`) });
    await expect(row).toHaveCount(1);
    await expect(row).toContainText('Amy');
    await expect(row).toContainText('Alice');
    await expect(row).toContainText(/2027[-/]03[-/]12/);
  }
  expect(world.get<RepaymentBrowserWrite[]>(repaymentWritesKey)).toEqual(confirmation.writes);
  expect(
    await readBrowserSplittingSnapshot(world),
    'Then must not mutate the saved accounting facts',
  ).toEqual(after);
}
