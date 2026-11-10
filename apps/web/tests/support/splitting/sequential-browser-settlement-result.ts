import { expect, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { callApi } from '../../../../api/tests/support/seed.js';
import {
  splittingMemberId,
  splittingTripId,
} from '../../../../api/tests/support/splitting/members-fixture.js';
import { snapshotSplittingSources } from '../../../../api/tests/support/splitting/expense-fixture.js';
import {
  assertSequentialSnackSources,
  assertExactlyZeroSnackView,
} from '../../../../api/tests/support/splitting/sequential-settlement-result.js';
import { assertPreservedSnackView } from '../../../../api/tests/support/splitting/preserved-settled-expense-result.js';
import { historicalRepaymentProjection } from '../../../../api/tests/support/splitting/preserved-settlement-history.js';
import { assertRepaymentFactItems } from '../../../../api/tests/support/splitting/repayment-facts-result.js';
import { readClosedBrowserSettlement } from './closed-settlement-result.js';
import { browserSplittingStateKey, type BrowserSplittingSnapshot } from './fixture.js';
import { browserSettledHistoryKey } from './settled-arrangement-fixture.js';
import { assertSavedSettlement, type LostSettlementCommand } from './lost-settlement-response.js';

export const sequentialBrowserSettlementPhrase = '三人已平衡且保留兩筆實付與原始份額';

/** Read both immutable records and their repayments; never issue another settlement or refresh Act. */
export async function assertSequentialBrowserSettlement(
  page: Page,
  world: LedgerWorld,
): Promise<void> {
  const initial = world.get<BrowserSplittingSnapshot>(browserSplittingStateKey);
  const history = world.get<BrowserSplittingSnapshot>(browserSettledHistoryKey);
  const { saved, record, after } = await readClosedBrowserSettlement(world);
  expect(saved.before).toEqual(history);
  expect(saved.command.paidAmount).toBe('34');
  const ids = {
    alice: splittingMemberId(world, 'Alice'),
    amy: splittingMemberId(world, 'Amy'),
    bob: splittingMemberId(world, 'Bob'),
    settlement: saved.command.id,
    repayment: saved.command.repaymentId,
  };
  expect(after.sources.members.map((row) => String(row.id)).sort()).toEqual(
    [ids.alice, ids.amy, ids.bob].sort(),
  );
  assertSequentialSnackSources(history.sources, after.sources, ids);
  assertExactlyZeroSnackView(after.settlement, [ids.alice, ids.amy, ids.bob]);
  expect(after.sources.expenses).toEqual(initial.sources.expenses);
  expect(after.sources.shares).toEqual(initial.sources.shares);
  const tripId = splittingTripId(world);
  const base = `/api/trips/${tripId}`;
  const first = history.sources.settlements[0]!;
  const firstPayment = history.sources.repayments[0]!;
  const firstCommand: LostSettlementCommand = {
    id: String(first.id),
    repaymentId: String(firstPayment.id),
    arrangementKey: String(first.arrangement_key),
    accountingRevision: String(first.source_revision),
    debtorMemberId: ids.amy,
    creditorMemberId: ids.alice,
    currencyCode: 'JPY',
    expectedAmount: { numerator: '100', denominator: '3', minorUnit: 0 },
    paidAmount: '33',
    paidOn: historicalRepaymentProjection(firstPayment).paidOn,
  };
  const firstRead = await callApi(world, 'GET', `${base}/settlements/${firstCommand.id}`);
  expect(firstRead.status()).toBe(200);
  const firstRecord = (await firstRead.json()) as Record<string, unknown>;
  assertSavedSettlement(initial, history, firstCommand, firstRecord, tripId);
  for (const [id, expected] of [
    [firstCommand.id, firstRecord],
    [saved.command.id, record],
  ] as const) {
    const read = await callApi(world, 'GET', `${base}/settlements/${id}`);
    expect(read.status()).toBe(200);
    expect(
      await read.json(),
      'Immutable settlement must be reproducible after both payments',
    ).toEqual(expected);
  }
  const repayments = await callApi(world, 'GET', `${base}/repayments`);
  expect(repayments.status()).toBe(200);
  assertRepaymentFactItems(
    ((await repayments.json()) as { items: unknown }).items,
    after.sources.repayments,
  );
  for (const payment of after.sources.repayments) {
    const read = await callApi(world, 'GET', `${base}/repayments/${String(payment.id)}`);
    expect(read.status()).toBe(200);
    expect(await read.json()).toEqual(historicalRepaymentProjection(payment));
  }
  const expenseId = world.splitting.ids.expenses.get('點心')!;
  const expense = await callApi(world, 'GET', `${base}/expenses/${expenseId}`);
  expect(expense.status()).toBe(200);
  assertPreservedSnackView(await expense.json(), initial.sources, expenseId, [
    ids.alice,
    ids.amy,
    ids.bob,
  ]);
  const reread = await callApi(world, 'GET', `${base}/settlement`);
  expect(reread.status()).toBe(200);
  expect(await reread.json()).toEqual(after.settlement);
  await expect(page.getByText(/已結清|全部結清|結清成功/).first()).toBeVisible();
  await expect(page.locator(`a[href*="/trips/${tripId}/settlements/new"]`)).toHaveCount(0);
  expect(await page.locator('main').innerText()).not.toMatch(
    /100\s*\/\s*3|33\.333|0\.00[1-9]|次最小單位/,
  );
  expect(
    await snapshotSplittingSources(world),
    'All Then reads preserve both histories and source facts',
  ).toEqual(after.sources);
}
