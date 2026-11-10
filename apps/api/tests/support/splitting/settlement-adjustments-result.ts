import { expect } from '@playwright/test';
import type { ExactAmount } from '@split-ledger/shared';
import type { LedgerWorld } from '../world.js';
import { callApi } from '../seed.js';
import {
  fixtureMinorAmount,
  independentSplittingOracle,
  snapshotSplittingSources,
} from './expense-fixture.js';
import { splittingMemberId, splittingTripId } from './members-fixture.js';
import { historicalRepaymentProjection } from './preserved-settlement-history.js';
import type { PendingSettlementSnapshot } from './current-arrangement-fixture.js';
import type { SourceSnapshot } from './types.js';

export const settlementAdjustmentsPhrase = '結清差額的兩位成員調整為：';

export interface SettlementAdjustmentRow {
  成員: string;
  幣別: string;
  調整: string;
}
interface Adjustment {
  memberId: string;
  currencyCode: string;
  amount: ExactAmount;
}

export function signedMajorAdjustment(text: string): ExactAmount {
  expect(text).toMatch(/^-?\d+(?:\/\d+|\.\d+)?$/);
  const [numerator, denominator] = text.includes('/')
    ? text.split('/')
    : (() => {
        const [whole, decimal = ''] = text.split('.');

        return [`${whole}${decimal}`, (10n ** BigInt(decimal.length)).toString()];
      })();
  expect(BigInt(denominator!) > 0n).toBe(true);

  return {
    numerator: BigInt(numerator!).toString(),
    denominator: BigInt(denominator!).toString(),
    minorUnit: 0,
  };
}

export function assertSettlementAdjustmentPair(
  actual: readonly Adjustment[],
  expected: readonly Adjustment[],
): void {
  expect(actual).toHaveLength(2);
  expect(expected).toHaveLength(2);
  expect(new Set(actual.map((row) => row.memberId)).size).toBe(2);
  expect(new Set(expected.map((row) => row.memberId)).size).toBe(2);
  for (const row of actual) {
    expect(row.amount.numerator).toMatch(/^-?(?:0|[1-9]\d*)$/);
    expect(row.amount.denominator).toMatch(/^[1-9]\d*$/);
    expect(
      Number.isInteger(row.amount.minorUnit) &&
        row.amount.minorUnit >= 0 &&
        row.amount.minorUnit <= 4,
    ).toBe(true);
    const wanted = expected.find((item) => item.memberId === row.memberId);
    expect(wanted).toBeDefined();
    expect(row.currencyCode).toBe(wanted!.currencyCode);
    expect(
      independentSplittingOracle.equal(row.amount, wanted!.amount),
      'Signed adjustment must match the exact major-unit fraction',
    ).toBe(true);
  }
  expect(actual[0]!.currencyCode).toBe(actual[1]!.currencyCode);
  expect(
    independentSplittingOracle.equal(actual[0]!.amount, {
      ...actual[1]!.amount,
      numerator: (-BigInt(actual[1]!.amount.numerator)).toString(),
    }),
    'Adjustment pair must sum to exactly zero',
  ).toBe(true);
}

export async function assertSettlementAdjustments(
  world: LedgerWorld,
  rows: readonly SettlementAdjustmentRow[],
): Promise<void> {
  expect(world.response!.status(), 'Settlement must commit successfully').toBe(201);
  expect(rows).toHaveLength(2);
  const expected = rows.map((row) => {
    expect(Object.keys(row).sort()).toEqual(['成員', '幣別', '調整'].sort());
    expect(row.幣別).toMatch(/^[A-Z]{3}$/);

    return {
      memberId: splittingMemberId(world, row.成員),
      currencyCode: row.幣別,
      amount: signedMajorAdjustment(row.調整),
    };
  });
  const before = world.get<SourceSnapshot>('splitting:before');
  const pending = world.get<PendingSettlementSnapshot>('splitting:settlementSnapshot');
  const request = world.get<PendingSettlementSnapshot & { paidAmount: string; paidOn: string }>(
    'splitting:settlementRequest',
  );
  const after = await snapshotSplittingSources(world);
  expect(after.settlements).toHaveLength(before.settlements.length + 1);
  expect(after.repayments).toHaveLength(before.repayments.length + 1);
  expect(after.adjustments).toHaveLength(before.adjustments.length + 2);
  for (const key of ['settlements', 'repayments', 'adjustments'] as const)
    for (const old of before[key]) expect(after[key]).toContainEqual(old);
  const settlements = after.settlements.filter((row) => row.id === pending.id);
  const repayments = after.repayments.filter((row) => row.id === pending.repaymentId);
  expect(settlements).toHaveLength(1);
  expect(repayments).toHaveLength(1);
  const settlement = settlements[0]!,
    repayment = repayments[0]!;
  const tripId = splittingTripId(world);
  expect(settlement).toMatchObject({
    trip_id: tripId,
    debtor_member_id: pending.debtorMemberId,
    creditor_member_id: pending.creditorMemberId,
    currency_code: pending.currencyCode,
    arrangement_key: pending.arrangementKey,
  });
  expect(String(settlement.source_revision)).toBe(pending.accountingRevision);
  expect(repayment).toMatchObject({
    trip_id: tripId,
    payer_member_id: pending.debtorMemberId,
    payee_member_id: pending.creditorMemberId,
    currency_code: pending.currencyCode,
    kind: 'settlement',
    settlement_id: pending.id,
  });
  expect(String(repayment.amount_minor)).toBe(
    fixtureMinorAmount(request.paidAmount, Number(repayment.minor_unit)).toString(),
  );
  expect(historicalRepaymentProjection(repayment).paidOn).toBe(request.paidOn);
  const obligation = {
    numerator: String(settlement.obligation_numerator),
    denominator: String(settlement.obligation_denominator),
    minorUnit: Number(settlement.obligation_minor_unit),
  };
  expect(independentSplittingOracle.equal(obligation, pending.expectedAmount)).toBe(true);
  // Independent integer arithmetic at major-unit scale; no product calculator or display rounding.
  const od = BigInt(obligation.denominator) * 10n ** BigInt(obligation.minorUnit);
  const pd = 10n ** BigInt(Number(repayment.minor_unit));
  const difference = {
    numerator: (
      BigInt(obligation.numerator) * pd -
      BigInt(String(repayment.amount_minor)) * od
    ).toString(),
    denominator: (od * pd).toString(),
    minorUnit: 0,
  };
  const oracle = [
    { memberId: pending.debtorMemberId, currencyCode: pending.currencyCode, amount: difference },
    {
      memberId: pending.creditorMemberId,
      currencyCode: pending.currencyCode,
      amount: { ...difference, numerator: (-BigInt(difference.numerator)).toString() },
    },
  ];
  assertSettlementAdjustmentPair(expected, oracle);
  const adjustments = after.adjustments.filter((row) => row.settlement_id === pending.id);
  for (const row of adjustments)
    expect(row).toMatchObject({ trip_id: tripId, owner_id: settlement.owner_id });
  const projected = adjustments.map((row) => ({
    memberId: String(row.member_id),
    currencyCode: String(row.currency_code),
    amount: {
      numerator: String(row.numerator),
      denominator: String(row.denominator),
      minorUnit: Number(row.minor_unit),
    },
  }));
  assertSettlementAdjustmentPair(projected, expected);
  expect(String(after.trips[0]!.accounting_revision)).toBe(
    (BigInt(String(before.trips[0]!.accounting_revision)) + 1n).toString(),
  );
  const reply = await world.response!.json();
  expect(reply).toMatchObject({
    id: pending.id,
    tripId,
    debtorMemberId: pending.debtorMemberId,
    creditorMemberId: pending.creditorMemberId,
    currencyCode: pending.currencyCode,
    repayment: historicalRepaymentProjection(repayment),
  });
  expect(independentSplittingOracle.equal(reply.obligation as ExactAmount, obligation)).toBe(true);
  assertSettlementAdjustmentPair(reply.adjustments as Adjustment[], expected);
  const response = await callApi(world, 'GET', `/api/trips/${tripId}/settlements/${pending.id}`);
  expect(response.status()).toBe(200);
  const record = await response.json();
  record.adjustments.sort((a: Adjustment, b: Adjustment) => a.memberId.localeCompare(b.memberId));
  reply.adjustments.sort((a: Adjustment, b: Adjustment) => a.memberId.localeCompare(b.memberId));
  expect(record).toEqual(reply);
  expect(
    await snapshotSplittingSources(world),
    'Then reads must preserve all accounting sources',
  ).toEqual(after);
}
