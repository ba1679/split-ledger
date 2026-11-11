import { sourceTimestamp } from './source-temporal.js';
import { expect } from '@playwright/test';
import type { ExactAmount } from '@split-ledger/shared';
import type { LedgerWorld } from '../world.js';
import { callApi } from '../seed.js';
import type { PendingSettlementSnapshot } from './current-arrangement-fixture.js';
import { independentSplittingOracle, snapshotSplittingSources } from './expense-fixture.js';
import {
  assertExactArrangementSet,
  directExpenseArrangements,
} from './expense-arrangements-result.js';
import { assertSettlementAdjustments } from './settlement-adjustments-result.js';
import { historicalRepaymentProjection } from './preserved-settlement-history.js';
import { splittingTripId } from './members-fixture.js';
import type { SourceSnapshot } from './types.js';
import type { AccessArrangement } from './access-fixture.js';

export const positiveSettlementClosedPhrase = '該安排已由正數實付關閉';

/** Full source oracle prevents closing Amy by accidentally losing Bob or another currency. */
export function assertClosedSettlementProjection(
  after: SourceSnapshot,
  pending: PendingSettlementSnapshot,
  view: {
    accountingRevision: string;
    simplifyDebts: boolean;
    balances: { memberId: string; currencyCode: string; netAmount: ExactAmount }[];
    arrangements: AccessArrangement[];
  },
): void {
  expect(view.accountingRevision).toBe(String(after.trips[0]!.accounting_revision));
  expect(view.simplifyDebts).toBe(false);
  expect(after.trips[0]!.simplify_debts).toBe(false);
  const currencies = [
    ...new Set(
      [...after.expenses, ...after.repayments, ...after.adjustments].map((row) =>
        String(row.currency_code),
      ),
    ),
  ];
  const expected = after.members.flatMap((member) =>
    currencies.map((currencyCode) => ({
      memberId: String(member.id),
      currencyCode,
      netAmount: independentSplittingOracle.balance(after, String(member.id), currencyCode),
    })),
  );
  expect(Array.isArray(view.balances)).toBe(true);
  expect(
    new Set(view.balances.map((row) => JSON.stringify([row.memberId, row.currencyCode]))).size,
  ).toBe(view.balances.length);
  for (const row of view.balances) {
    const wanted = expected.find(
      (item) => item.memberId === row.memberId && item.currencyCode === row.currencyCode,
    );
    expect(wanted, 'No unknown member or currency in latest balances').toBeDefined();
    expect(independentSplittingOracle.equal(row.netAmount, wanted!.netAmount)).toBe(true);
  }
  for (const row of expected.filter((item) => BigInt(item.netAmount.numerator) !== 0n))
    expect(
      view.balances.some(
        (item) => item.memberId === row.memberId && item.currencyCode === row.currencyCode,
      ),
      'Every nonzero source balance survives',
    ).toBe(true);
  expect(
    independentSplittingOracle.balance(after, pending.debtorMemberId, pending.currencyCode)
      .numerator,
    'The original debtor has no unpaid or reverse difference',
  ).toBe('0');
  const arrangements = directExpenseArrangements(after);
  expect(
    arrangements.some(
      (row) =>
        row.currencyCode === pending.currencyCode &&
        ((row.debtorMemberId === pending.debtorMemberId &&
          row.creditorMemberId === pending.creditorMemberId) ||
          (row.debtorMemberId === pending.creditorMemberId &&
            row.creditorMemberId === pending.debtorMemberId)),
    ),
  ).toBe(false);
  assertExactArrangementSet(view.arrangements, arrangements);
}

export async function assertPositiveSettlementClosed(world: LedgerWorld): Promise<void> {
  expect(
    world.response!.status(),
    'Any valid positive actual payment must settle successfully',
  ).toBe(201);
  const pending = world.get<PendingSettlementSnapshot>('splitting:settlementSnapshot');
  const request = world.get<PendingSettlementSnapshot & { paidAmount: string; paidOn: string }>(
    'splitting:settlementRequest',
  );
  expect(request.paidAmount).toMatch(/^[1-9]\d*$/);
  const amount = pending.expectedAmount;
  const denominator = BigInt(amount.denominator) * 10n ** BigInt(amount.minorUnit);
  const difference = BigInt(amount.numerator) - BigInt(request.paidAmount) * denominator;
  await assertSettlementAdjustments(world, [
    { 成員: 'Amy', 幣別: pending.currencyCode, 調整: `${difference}/${denominator}` },
    { 成員: 'Alice', 幣別: pending.currencyCode, 調整: `${-difference}/${denominator}` },
  ]);
  const after = await snapshotSplittingSources(world);
  const before = world.get<SourceSnapshot>('splitting:before');
  for (const key of ['expenses', 'shares', 'members'] as const)
    expect(after[key]).toEqual(before[key]);
  const settlement = after.settlements.find((row) => row.id === pending.id)!;
  const repayment = after.repayments.find((row) => row.id === pending.repaymentId)!;
  expect(after.repayments.filter((row) => row.settlement_id === pending.id)).toHaveLength(1);
  const reply = await world.response!.json();
  expect(reply).toMatchObject({
    arrangementKey: pending.arrangementKey,
    sourceRevision: pending.accountingRevision,
    simplifyDebts: before.trips[0]!.simplify_debts,
    createdAt: sourceTimestamp(settlement.created_at),
  });
  const payment = await callApi(
    world,
    'GET',
    `/api/trips/${splittingTripId(world)}/repayments/${pending.repaymentId}`,
  );
  expect(payment.status()).toBe(200);
  expect(await payment.json()).toEqual(historicalRepaymentProjection(repayment));
  const response = await callApi(world, 'GET', `/api/trips/${splittingTripId(world)}/settlement`);
  expect(response.status()).toBe(200);
  assertClosedSettlementProjection(after, pending, await response.json());
  expect(await snapshotSplittingSources(world), 'Then must only read sources').toEqual(after);
}
