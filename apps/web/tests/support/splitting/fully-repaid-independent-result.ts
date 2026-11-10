import { expect, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { callApi } from '../../../../api/tests/support/seed.js';
import {
  splittingMemberId,
  splittingTripId,
} from '../../../../api/tests/support/splitting/members-fixture.js';
import { independentSplittingOracle } from '../../../../api/tests/support/splitting/expense-fixture.js';
import { historicalRepaymentProjection } from '../../../../api/tests/support/splitting/preserved-settlement-history.js';
import { assertExactArrangementSet } from '../../../../api/tests/support/splitting/expense-arrangements-result.js';
import {
  readBrowserSplittingSnapshot,
  assertBrowserSettlementBalances,
  type BrowserSplittingSnapshot,
} from './fixture.js';
import { assertSavedIndependentRepayment } from './lost-repayment-response.js';
import {
  independentRepaymentSaveKey,
  type IndependentRepaymentSave,
} from './save-independent-repayment.js';
import { browserRepaymentFixtureKey } from './independent-repayment-fixture.js';
import type { RepaymentDraft } from './repayment-draft.js';

export const fullyRepaidIndependentPhrase = 'JPY 已結清且保留 JPY 400 與 JPY 600 兩筆獨立實付';

/** Preserve both cash facts; no settlement event may manufacture a zero balance. */
export function assertTwoIndependentRepayments(
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
    amount: '600',
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
    paidOn: '2027-03-12',
    kind: 'independent',
    settlementId: null,
  });
  expect(first.id).not.toBe(draft.id);
  expect(before.repayments.items).toEqual([first]);
  expect(before.sources.settlements).toEqual([]);
  expect(before.sources.adjustments).toEqual([]);
  assertSavedIndependentRepayment(before, after, draft, saved, tripId);
  expect(after.sources.settlements).toEqual([]);
  expect(after.sources.adjustments).toEqual([]);
  expect(after.sources.repayments).toHaveLength(2);
  const records = after.sources.repayments.map(historicalRepaymentProjection);
  expect(records.find((record) => record.id === first.id)).toEqual(first);
  expect(records.find((record) => record.id === draft.id)).toEqual(saved);
  expect(after.repayments.items).toHaveLength(2);
  expect(after.repayments.items.map((record) => record.id).sort()).toEqual(
    [first.id, draft.id].sort(),
  );
  for (const record of records)
    expect(after.repayments.items.find((item) => item.id === record.id)).toEqual(record);
  for (const [snapshot, jpy] of [
    [before, '600'],
    [after, '0'],
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
          `${member} ${currency} must reflect only the independent cash facts`,
        ).toBe(true);
  }
  assertExactArrangementSet(after.settlement.arrangements, [
    {
      debtorMemberId: amy,
      creditorMemberId: alice,
      currencyCode: 'TWD',
      amount: { numerator: '300', denominator: '1', minorUnit: 0 },
    },
  ]);

  return records;
}

/** Read-only Then: inspect the saved screen and the original UUID resources. */
export async function assertFullyRepaidIndependentScreen(
  page: Page,
  world: LedgerWorld,
): Promise<void> {
  const save = world.get<IndependentRepaymentSave>(independentRepaymentSaveKey);
  expect(save.outcome).toBe('saved');
  expect(save.status).toBe(201);
  const after = await readBrowserSplittingSnapshot(world);
  expect(after).toEqual(save.after);
  const alice = splittingMemberId(world, 'Alice');
  const amy = splittingMemberId(world, 'Amy');
  const tripId = splittingTripId(world);
  const prior = world.get<{
    request: RepaymentDraft;
    repayment: Record<string, unknown>;
    after: BrowserSplittingSnapshot;
  }>(browserRepaymentFixtureKey);
  expect(save.before).toEqual(prior.after);
  expect(save.before.repayments.items).toEqual([prior.repayment]);
  expect(prior.repayment.id).toBe(prior.request.id);
  const records = assertTwoIndependentRepayments(
    save.before,
    after,
    save.draft,
    save.response as Record<string, unknown>,
    tripId,
    alice,
    amy,
  );
  for (const record of records) {
    const detail = await callApi(
      world,
      'GET',
      `/api/trips/${tripId}/repayments/${String(record.id)}`,
    );
    expect(detail.status(), 'Each original independent repayment UUID remains readable').toBe(200);
    expect(await detail.json()).toEqual(record);
  }
  await expect(
    page.getByText(/還款已儲存|已儲存還款|還款已保存|還款成功|儲存成功|保存成功/).first(),
  ).toBeVisible();
  const arrangements = page.getByRole('region', { name: '付款安排', exact: true });
  await expect(arrangements).toBeVisible();
  await expect(arrangements.getByText(/JPY\s*已結清|JPY.*沒有待付款|JPY.*無待付款/)).toBeVisible();
  await expect(arrangements.getByRole('group', { name: /JPY/ })).toHaveCount(0);
  const twd = arrangements.getByRole('group', { name: 'Amy 付款給 Alice TWD', exact: true });
  await expect(twd).toBeVisible();
  await expect(twd.getByText('TWD 300', { exact: true })).toBeVisible();
  const history = page.getByRole('list', { name: '還款紀錄', exact: true });
  await expect(history.getByRole('listitem')).toHaveCount(2);
  for (const amount of ['400', '600']) {
    const row = history
      .getByRole('listitem')
      .filter({ hasText: new RegExp(`JPY\\s*${amount}(?:\\D|$)`) });
    await expect(row).toHaveCount(1);
    await expect(row).toContainText('Amy');
    await expect(row).toContainText('Alice');
    await expect(row).toContainText(/2027[-/]03[-/]12/);
  }
  expect(
    await readBrowserSplittingSnapshot(world),
    'Then must not mutate any accounting source or projection',
  ).toEqual(after);
}
