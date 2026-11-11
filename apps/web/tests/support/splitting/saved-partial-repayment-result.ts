import { expect, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { callApi } from '../../../../api/tests/support/seed.js';
import { historicalRepaymentProjection } from '../../../../api/tests/support/splitting/preserved-settlement-history.js';
import {
  splittingMemberId,
  splittingTripId,
} from '../../../../api/tests/support/splitting/members-fixture.js';
import { independentSplittingOracle } from '../../../../api/tests/support/splitting/expense-fixture.js';
import { assertExactArrangementSet } from '../../../../api/tests/support/splitting/expense-arrangements-result.js';
import {
  readBrowserSplittingSnapshot,
  assertBrowserSettlementBalances,
  type BrowserSplittingSnapshot,
} from './fixture.js';
import {
  assertSavedIndependentRepayment,
  lostRepaymentResponseKey,
  type LostRepaymentResponseState,
} from './lost-repayment-response.js';
import {
  independentRepaymentSaveKey,
  type IndependentRepaymentSave,
} from './save-independent-repayment.js';
import {
  repaymentWritesKey,
  type RepaymentBrowserWrite,
  type RepaymentDraft,
} from './repayment-draft.js';

export const savedPartialRepaymentPhrase =
  '已保存 JPY 400 實付且 Amy 剩餘應付 Alice JPY 600、TWD 300';

/** Independent payment changes only JPY debt and creates precisely one immutable cash fact. */
export function assertSavedPartialRepayment(
  before: BrowserSplittingSnapshot,
  after: BrowserSplittingSnapshot,
  draft: RepaymentDraft,
  saved: Record<string, unknown>,
  tripId: string,
  alice: string,
  amy: string,
): void {
  expect(draft).toEqual({
    id: draft.id,
    payerMemberId: amy,
    payeeMemberId: alice,
    currencyCode: 'JPY',
    amount: '400',
    paidOn: '2027-03-12',
  });
  expect(before.sources.repayments).toEqual([]);
  expect(before.repayments.items).toEqual([]);
  expect(before.sources.settlements).toEqual([]);
  expect(before.sources.adjustments).toEqual([]);
  assertSavedIndependentRepayment(before, after, draft, saved, tripId);
  expect(after.sources.repayments).toHaveLength(1);
  expect(historicalRepaymentProjection(after.sources.repayments[0]!)).toEqual(saved);
  expect(after.repayments.items).toEqual([saved]);
  expect(after.sources.settlements).toEqual([]);
  expect(after.sources.adjustments).toEqual([]);
  for (const [snapshot, jpy] of [
    [before, '1000'],
    [after, '600'],
  ] as const) {
    assertBrowserSettlementBalances(snapshot.sources, snapshot.settlement.balances);
    for (const [memberId, sign] of [
      [alice, 1n],
      [amy, -1n],
    ] as const)
      for (const [currency, amount] of [
        ['JPY', jpy],
        ['TWD', '300'],
      ] as const)
        expect(
          independentSplittingOracle.equal(
            independentSplittingOracle.balance(snapshot.sources, memberId, currency),
            { numerator: (BigInt(amount) * sign).toString(), denominator: '1', minorUnit: 0 },
          ),
          `${memberId} ${currency} must match the remaining debt`,
        ).toBe(true);
    assertExactArrangementSet(snapshot.settlement.arrangements, [
      {
        debtorMemberId: amy,
        creditorMemberId: alice,
        currencyCode: 'JPY',
        amount: { numerator: jpy, denominator: '1', minorUnit: 0 },
      },
      {
        debtorMemberId: amy,
        creditorMemberId: alice,
        currencyCode: 'TWD',
        amount: { numerator: '300', denominator: '1', minorUnit: 0 },
      },
    ]);
  }
}

/** Read-only Then; lost transport success must have been recovered by the original UUID. */
export async function assertSavedPartialRepaymentScreen(
  page: Page,
  world: LedgerWorld,
): Promise<void> {
  const save = world.get<IndependentRepaymentSave>(independentRepaymentSaveKey);
  const lost = world.state.get(lostRepaymentResponseKey) as LostRepaymentResponseState | undefined;
  expect([
    'saved',
    'recovered',
    ...(lost?.availability === 'available' ? ['unconfirmed'] : []),
  ]).toContain(save.outcome);
  const tripId = splittingTripId(world);
  let saved = save.response as Record<string, unknown>;
  if (save.outcome === 'saved') expect(save.status).toBe(201);
  else {
    expect(
      lost,
      'A missing POST response needs real original-UUID recovery evidence',
    ).toBeDefined();
    await expect
      .poll(
        () =>
          lost!.lookups.some(
            (lookup) => lookup.id === save.draft.id && lookup.browserStatus === 200,
          ),
        { message: 'Allow the existing read-only recovery to confirm the original UUID' },
      )
      .toBe(true);
    expect(lost!.failure).toBeUndefined();
    expect(lost!.availability).toBe('available');
    expect(lost!.mutations).toHaveLength(1);
    expect(lost!.ids.commandId).toBe(save.draft.id);
    expect(lost!.ids.mutationIds).toEqual([save.draft.id]);
    expect(lost!.lookups.length).toBeGreaterThan(0);
    for (const lookup of lost!.lookups)
      expect(lookup).toEqual({ id: save.draft.id, actualStatus: 200, browserStatus: 200 });
    saved = lost!.savedResponse!;
  }
  expect(world.get<RepaymentBrowserWrite[]>(repaymentWritesKey)).toEqual([
    { method: 'POST', path: `/api/trips/${tripId}/repayments`, body: save.draft },
  ]);
  const after = await readBrowserSplittingSnapshot(world);
  expect(after).toEqual(save.after);
  assertSavedPartialRepayment(
    save.before,
    after,
    save.draft,
    saved,
    tripId,
    splittingMemberId(world, 'Alice'),
    splittingMemberId(world, 'Amy'),
  );
  const detail = await callApi(world, 'GET', `/api/trips/${tripId}/repayments/${save.draft.id}`);
  expect(detail.status(), 'The original repayment UUID must be readable').toBe(200);
  expect(await detail.json()).toEqual(saved);
  await expect(
    page.getByText(/還款已儲存|已儲存還款|還款已保存|還款成功|儲存成功|保存成功/).first(),
  ).toBeVisible();
  const arrangements = page.getByRole('region', { name: '付款安排', exact: true });
  await expect(arrangements).toBeVisible();
  await expect(arrangements.getByRole('group')).toHaveCount(2);
  for (const [currency, amount] of [
    ['JPY', '600'],
    ['TWD', '300'],
  ] as const) {
    const row = arrangements.getByRole('group', {
      name: `Amy 付款給 Alice ${currency}`,
      exact: true,
    });
    await expect(row).toBeVisible();
    await expect(row.getByText(`${currency} ${amount}`, { exact: true })).toBeVisible();
  }
  const history = page.getByRole('list', { name: '還款紀錄', exact: true });
  await expect(history.getByRole('listitem')).toHaveCount(1);
  await expect(history).toContainText('Amy');
  await expect(history).toContainText('Alice');
  await expect(history).toContainText(/JPY\s*400(?:\D|$)/);
  await expect(history).toContainText(/2027[-/]03[-/]12/);
  expect(
    await readBrowserSplittingSnapshot(world),
    'Then must preserve the authoritative saved result',
  ).toEqual(after);
}
