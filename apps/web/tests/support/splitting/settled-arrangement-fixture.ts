import { expect } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { callApi } from '../../../../api/tests/support/seed.js';
import {
  captureCurrentAmyArrangement,
  type PendingSettlementSnapshot,
} from '../../../../api/tests/support/splitting/current-arrangement-fixture.js';
import {
  independentSplittingOracle,
  snapshotSplittingSources,
} from '../../../../api/tests/support/splitting/expense-fixture.js';
import {
  splittingMemberId,
  splittingTripId,
} from '../../../../api/tests/support/splitting/members-fixture.js';
import { assertSettlementAdjustments } from '../../../../api/tests/support/splitting/settlement-adjustments-result.js';
import { historicalRepaymentProjection } from '../../../../api/tests/support/splitting/preserved-settlement-history.js';
import {
  browserSplittingStateKey,
  readBrowserSplittingSnapshot,
  type BrowserSplittingSnapshot,
} from './fixture.js';

export const browserSettledArrangementPhrase = 'Amy 支付 Alice JPY 33 的安排已結清';

export const browserSettledHistoryKey = 'splitting:browserSettledHistory';

/** Complete the existing arrangement through the actual API; never manufacture history. */
export async function settleBrowserAmyArrangement(world: LedgerWorld): Promise<void> {
  const initial = world.get<BrowserSplittingSnapshot>(browserSplittingStateKey);
  expect(await snapshotSplittingSources(world)).toEqual(initial.sources);
  await captureCurrentAmyArrangement(world);
  const pending = world.get<PendingSettlementSnapshot>('splitting:settlementSnapshot');
  expect(
    independentSplittingOracle.equal(pending.expectedAmount, {
      numerator: '100',
      denominator: '3',
      minorUnit: 0,
    }),
    'This Given settles the original hundred-yen three-person share',
  ).toBe(true);
  const request = {
    ...pending,
    expectedAmount: { ...pending.expectedAmount },
    paidAmount: '33',
    paidOn: '2027-03-11',
  };
  world.set('splitting:settlementRequest', request);
  world.response = await callApi(
    world,
    'POST',
    `/api/trips/${splittingTripId(world)}/settlements`,
    request,
  );
  expect(world.response.status(), 'Product must atomically save the actual settlement').toBe(201);
  await assertSettlementAdjustments(world, [
    { 成員: 'Amy', 幣別: 'JPY', 調整: '1/3' },
    { 成員: 'Alice', 幣別: 'JPY', 調整: '-1/3' },
  ]);
  const history = await readBrowserSplittingSnapshot(world);
  expect(history.sources.expenses).toEqual(initial.sources.expenses);
  expect(history.sources.shares).toEqual(initial.sources.shares);
  expect(history.sources.members).toEqual(initial.sources.members);
  expect(history.sources.settlements).toHaveLength(1);
  expect(history.sources.repayments).toHaveLength(1);
  expect(history.sources.adjustments).toHaveLength(2);
  const repayment = historicalRepaymentProjection(history.sources.repayments[0]!);
  expect(repayment).toMatchObject({
    id: pending.repaymentId,
    amount: '33',
    minorUnit: 0,
    currencyCode: 'JPY',
    kind: 'settlement',
    settlementId: pending.id,
    paidOn: '2027-03-11',
  });
  expect(history.repayments.items).toEqual([repayment]);
  const read = await callApi(
    world,
    'GET',
    `/api/trips/${splittingTripId(world)}/repayments/${pending.repaymentId}`,
  );
  expect(read.status()).toBe(200);
  expect(await read.json()).toEqual(repayment);
  const amyId = splittingMemberId(world, 'Amy');
  expect(independentSplittingOracle.balance(history.sources, amyId, 'JPY').numerator).toBe('0');
  expect(
    history.settlement.arrangements.some(
      (row) => row.debtorMemberId === amyId || row.creditorMemberId === amyId,
    ),
  ).toBe(false);
  expect(
    await snapshotSplittingSources(world),
    'All post-save authority reads are read-only',
  ).toEqual(history.sources);
  world.set(browserSettledHistoryKey, history);
  world.set('splitting:historySnapshot', history.sources);
  world.set('splitting:sourceSnapshot', history.sources);
  world.set('splitting:revision', history.settlement.accountingRevision);
  world.splitting.snapshot = history.sources;
  world.splitting.ids.settlements.set('Amy:Alice:JPY', pending.id);
  world.splitting.ids.repayments.set('settlement:Amy:Alice:JPY', pending.repaymentId);
}
