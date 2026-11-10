import { expect } from '@playwright/test';
import type { ExactAmount } from '@split-ledger/shared';
import type { LedgerWorld } from '../world.js';
import { callApi } from '../seed.js';
import { independentSplittingOracle, snapshotSplittingSources } from './expense-fixture.js';
import {
  assertExactArrangementSet,
  directExpenseArrangements,
} from './expense-arrangements-result.js';
import { assertSettlementPreservesExpenseSources } from './preserved-settled-expense-result.js';
import { assertSettlementAdjustmentPair } from './settlement-adjustments-result.js';
import { splittingTripId } from './members-fixture.js';
import type { PendingSettlementSnapshot } from './current-arrangement-fixture.js';
import type { AccessArrangement } from './access-fixture.js';
import type { SourceSnapshot } from './types.js';

export const noSettlementRemainderPhrase = '該安排沒有反向付款或殘餘尾差';

/** Prove the local source contribution cancels exactly, independently of display rounding. */
export function assertExactSettlementCancellation(
  before: SourceSnapshot,
  after: SourceSnapshot,
  pending: PendingSettlementSnapshot,
): void {
  assertSettlementPreservesExpenseSources(before, after);
  const settlements = after.settlements.filter((row) => row.id === pending.id);
  expect(settlements).toHaveLength(1);
  expect(settlements[0]).toMatchObject({
    debtor_member_id: pending.debtorMemberId,
    creditor_member_id: pending.creditorMemberId,
    currency_code: pending.currencyCode,
  });
  const obligation = {
    numerator: String(settlements[0]!.obligation_numerator),
    denominator: String(settlements[0]!.obligation_denominator),
    minorUnit: Number(settlements[0]!.obligation_minor_unit),
  };
  expect(independentSplittingOracle.equal(obligation, pending.expectedAmount)).toBe(true);
  const payments = after.repayments.filter((row) => row.settlement_id === pending.id);
  expect(payments).toHaveLength(1);
  const payment = payments[0]!;
  expect(payment).toMatchObject({
    id: pending.repaymentId,
    kind: 'settlement',
    payer_member_id: pending.debtorMemberId,
    payee_member_id: pending.creditorMemberId,
    currency_code: pending.currencyCode,
  });
  expect(BigInt(String(payment.amount_minor)) > 0n).toBe(true);
  const od = BigInt(obligation.denominator) * 10n ** BigInt(obligation.minorUnit);
  const pd = 10n ** BigInt(Number(payment.minor_unit));
  const difference: ExactAmount = {
    numerator: (
      BigInt(obligation.numerator) * pd -
      BigInt(String(payment.amount_minor)) * od
    ).toString(),
    denominator: (od * pd).toString(),
    minorUnit: 0,
  };
  const adjustments = after.adjustments.filter((row) => row.settlement_id === pending.id);
  assertSettlementAdjustmentPair(
    adjustments.map((row) => ({
      memberId: String(row.member_id),
      currencyCode: String(row.currency_code),
      amount: {
        numerator: String(row.numerator),
        denominator: String(row.denominator),
        minorUnit: Number(row.minor_unit),
      },
    })),
    [
      { memberId: pending.debtorMemberId, currencyCode: pending.currencyCode, amount: difference },
      {
        memberId: pending.creditorMemberId,
        currencyCode: pending.currencyCode,
        amount: { ...difference, numerator: (-BigInt(difference.numerator)).toString() },
      },
    ],
  );
  const debtorAdjustment = adjustments.find((row) => row.member_id === pending.debtorMemberId)!;
  const ad =
    BigInt(String(debtorAdjustment.denominator)) *
    10n ** BigInt(Number(debtorAdjustment.minor_unit));
  expect(
    -BigInt(obligation.numerator) * pd * ad +
      BigInt(String(payment.amount_minor)) * od * ad +
      BigInt(String(debtorAdjustment.numerator)) * od * pd,
    'Original debt + actual cash + adjustment must cancel exactly, not round to display zero',
  ).toBe(0n);
}

export async function assertNoSettlementRemainder(world: LedgerWorld): Promise<void> {
  expect(world.response!.status()).toBe(201);
  const before = world.get<SourceSnapshot>('splitting:before');
  const pending = world.get<PendingSettlementSnapshot>('splitting:settlementSnapshot');
  const after = await snapshotSplittingSources(world);
  assertExactSettlementCancellation(before, after, pending);
  const expected = directExpenseArrangements(after);
  expect(
    expected.filter(
      (row) =>
        row.currencyCode === pending.currencyCode &&
        [pending.debtorMemberId, pending.creditorMemberId].includes(row.debtorMemberId) &&
        [pending.debtorMemberId, pending.creditorMemberId].includes(row.creditorMemberId),
    ),
  ).toEqual([]);
  const response = await callApi(world, 'GET', `/api/trips/${splittingTripId(world)}/settlement`);
  expect(response.status()).toBe(200);
  const view = (await response.json()) as {
    arrangements: AccessArrangement[];
    balances: { memberId: string; currencyCode: string; netAmount: ExactAmount }[];
  };
  // These scenarios use direct star debts, for which simplification has the same complete result.
  assertExactArrangementSet(view.arrangements, expected);
  expect(Array.isArray(view.balances)).toBe(true);
  const keys = view.balances.map((row) => JSON.stringify([row.memberId, row.currencyCode]));
  expect(new Set(keys).size).toBe(keys.length);
  for (const row of view.balances) {
    expect(after.members.some((member) => member.id === row.memberId)).toBe(true);
    expect(row.currencyCode).toBe(pending.currencyCode);
    expect(
      independentSplittingOracle.equal(
        row.netAmount,
        independentSplittingOracle.balance(after, row.memberId, row.currencyCode),
      ),
    ).toBe(true);
  }
  for (const member of after.members) {
    const amount = independentSplittingOracle.balance(
      after,
      String(member.id),
      pending.currencyCode,
    );
    if (BigInt(amount.numerator) !== 0n)
      expect(
        view.balances.some(
          (row) => row.memberId === member.id && row.currencyCode === pending.currencyCode,
        ),
      ).toBe(true);
  }
  expect(await snapshotSplittingSources(world), 'Then reads cannot write sources').toEqual(after);
}
