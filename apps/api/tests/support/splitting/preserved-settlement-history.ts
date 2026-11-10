import { expect } from '@playwright/test';
import type { ExactAmount } from '@split-ledger/shared';
import type { LedgerWorld } from '../world.js';
import { callApi } from '../seed.js';
import { independentSplittingOracle, snapshotSplittingSources } from './expense-fixture.js';
import { splittingTripId } from './members-fixture.js';
import type { SourceSnapshot } from './types.js';

export const preservedSettlementHistoryPhrase = '原支出修正後的歷史結清快照保持不變';

// SQL DATE is parsed at local midnight; timestamp Date values already retain milliseconds.
const dateOnly = (value: unknown) =>
  value instanceof Date
    ? `${String(value.getFullYear()).padStart(4, '0')}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
    : String(value).slice(0, 10);
const timestamp = (value: unknown) =>
  (value instanceof Date ? value : new Date(String(value))).toISOString();

export function historicalRepaymentProjection(row: Record<string, unknown>) {
  const unit = Number(row.minor_unit);
  const digits = BigInt(String(row.amount_minor))
    .toString()
    .padStart(unit + 1, '0');

  return {
    id: row.id,
    tripId: row.trip_id,
    payerMemberId: row.payer_member_id,
    payeeMemberId: row.payee_member_id,
    amount: unit ? `${digits.slice(0, -unit)}.${digits.slice(-unit)}` : digits,
    currencyCode: row.currency_code,
    minorUnit: unit,
    paidOn: dateOnly(row.paid_on),
    kind: row.kind,
    settlementId: row.settlement_id,
    createdAt: timestamp(row.created_at),
  };
}

export function assertHistoricalCurrentBalances(
  actual: readonly { memberId: string; currencyCode: string; netAmount: ExactAmount }[],
  expected: readonly { memberId: string; amount: ExactAmount }[],
): void {
  expect(Array.isArray(actual)).toBe(true);
  expect(new Set(actual.map((row) => row.memberId)).size, 'Balance rows must be unique').toBe(
    actual.length,
  );
  for (const row of actual) {
    expect(row.currencyCode).toBe('JPY');
    const oracle = expected.find((balance) => balance.memberId === row.memberId);
    expect(oracle, 'Balance must belong to this trip').toBeDefined();
    expect(independentSplittingOracle.equal(row.netAmount, oracle!.amount)).toBe(true);
  }
  for (const balance of expected.filter((row) => BigInt(row.amount.numerator) !== 0n))
    expect(
      actual.some((row) => row.memberId === balance.memberId),
      'Every nonzero balance must appear',
    ).toBe(true);
}

export async function assertPreservedSettlementHistory(world: LedgerWorld): Promise<void> {
  const before = world.get<SourceSnapshot>('splitting:before');
  const history = world.get<SourceSnapshot>('splitting:historySnapshot');
  const expenseId = world.get<string>('splitting:originalExpenseId');
  expect(before.settlements).toHaveLength(1);
  expect(before.repayments).toHaveLength(1);
  expect(before.adjustments).toHaveLength(2);
  for (const key of ['settlements', 'repayments', 'adjustments'] as const)
    expect(before[key], 'Act must start from the completed historical fixture').toEqual(
      history[key],
    );
  const deleted = !world.state.has('splitting:expenseRequest');
  expect(world.response!.status(), 'Source correction must succeed').toBe(deleted ? 204 : 200);
  const after = await snapshotSplittingSources(world);
  for (const key of ['settlements', 'repayments', 'adjustments'] as const)
    expect(after[key], `Source correction must preserve every historical ${key} column`).toEqual(
      before[key],
    );
  expect(after.expenses.some((row) => row.id === expenseId)).toBe(!deleted);
  const tripId = splittingTripId(world);
  const settlement = before.settlements[0]!;
  const repayment = historicalRepaymentProjection(before.repayments[0]!);
  const expected = {
    id: settlement.id,
    tripId,
    arrangementKey: settlement.arrangement_key,
    sourceRevision: String(settlement.source_revision),
    simplifyDebts: settlement.simplify_debts,
    debtorMemberId: settlement.debtor_member_id,
    creditorMemberId: settlement.creditor_member_id,
    currencyCode: settlement.currency_code,
    obligation: {
      numerator: String(settlement.obligation_numerator),
      denominator: String(settlement.obligation_denominator),
      minorUnit: Number(settlement.obligation_minor_unit),
    },
    repayment,
    adjustments: before.adjustments
      .map((row) => ({
        memberId: row.member_id,
        currencyCode: row.currency_code,
        amount: {
          numerator: String(row.numerator),
          denominator: String(row.denominator),
          minorUnit: Number(row.minor_unit),
        },
      }))
      .sort((a, b) => String(a.memberId).localeCompare(String(b.memberId))),
    createdAt: timestamp(settlement.created_at),
  };
  for (let read = 0; read < 2; read++) {
    const response = await callApi(
      world,
      'GET',
      `/api/trips/${tripId}/settlements/${settlement.id}`,
    );
    expect(response.status(), 'Historical settlement must remain readable').toBe(200);
    const body = await response.json();
    expect(Array.isArray(body.adjustments)).toBe(true);
    body.adjustments.sort((a: { memberId: string }, b: { memberId: string }) =>
      a.memberId.localeCompare(b.memberId),
    );
    expect(body).toEqual(expected);
    const payment = await callApi(world, 'GET', `/api/trips/${tripId}/repayments/${repayment.id}`);
    expect(payment.status()).toBe(200);
    expect(await payment.json()).toEqual(repayment);
  }
  const response = await callApi(world, 'GET', `/api/trips/${tripId}/settlement`);
  expect(response.status()).toBe(200);
  const view = await response.json();
  expect(view.accountingRevision).toBe(String(after.trips[0]!.accounting_revision));
  const expectedBalances = after.members.map((member) => ({
    memberId: String(member.id),
    amount: independentSplittingOracle.balance(after, String(member.id), 'JPY'),
  }));
  assertHistoricalCurrentBalances(view.balances, expectedBalances);
  const debtor = expectedBalances.find((row) => BigInt(row.amount.numerator) < 0n)!;
  const creditor = expectedBalances.find((row) => BigInt(row.amount.numerator) > 0n)!;
  expect(view.arrangements).toHaveLength(1);
  expect(view.arrangements[0]).toMatchObject({
    debtorMemberId: debtor.memberId,
    creditorMemberId: creditor.memberId,
    currencyCode: 'JPY',
  });
  expect(
    independentSplittingOracle.equal(view.arrangements[0].amount as ExactAmount, creditor.amount),
  ).toBe(true);
  expect(
    await snapshotSplittingSources(world),
    'Verification reads must not rewrite history or reapply adjustments',
  ).toEqual(after);
}
