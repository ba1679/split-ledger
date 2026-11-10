import { sourceTimestamp } from './source-temporal.js';
import { expect } from '@playwright/test';
import type { ExactAmount } from '@split-ledger/shared';
import type { LedgerWorld } from '../world.js';
import { callApi } from '../seed.js';
import { independentSplittingOracle, snapshotSplittingSources } from './expense-fixture.js';
import { splittingMemberId, splittingTripId } from './members-fixture.js';
import { assertRepaymentFactItems } from './repayment-facts-result.js';
import {
  assertPreservedSnackView,
  assertSettlementPreservesExpenseSources,
} from './preserved-settled-expense-result.js';
import { assertSettlementAdjustmentPair } from './settlement-adjustments-result.js';
import type { SourceSnapshot } from './types.js';
import { historicalRepaymentProjection } from './preserved-settlement-history.js';
import { assertSettlementHasNoPolicy } from './no-rounding-policy-result.js';

export const sequentialSettlementResultPhrase = '點心所有安排結清且全體沒有尾差';

/** The original 201 body must describe the new immutable Bob record in full. */
export function assertSequentialSettlementRecord(
  value: unknown,
  sources: SourceSnapshot,
  settlementId: string,
  repaymentId: string,
): void {
  const settlement = sources.settlements.find((row) => row.id === settlementId)!;
  const repayment = sources.repayments.find((row) => row.id === repaymentId)!;
  assertSettlementHasNoPolicy(value);
  const record = value as Record<string, unknown> & { adjustments: { memberId: string }[] };
  expect({
    ...record,
    adjustments: [...record.adjustments].sort((a, b) => a.memberId.localeCompare(b.memberId)),
  }).toEqual({
    id: settlementId,
    tripId: settlement.trip_id,
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
    repayment: historicalRepaymentProjection(repayment),
    adjustments: sources.adjustments
      .filter((row) => row.settlement_id === settlementId)
      .map((row) => ({
        memberId: String(row.member_id),
        currencyCode: String(row.currency_code),
        amount: {
          numerator: String(row.numerator),
          denominator: String(row.denominator),
          minorUnit: Number(row.minor_unit),
        },
      }))
      .sort((a, b) => a.memberId.localeCompare(b.memberId)),
    createdAt: sourceTimestamp(settlement.created_at),
  });
}

export function assertSequentialSnackSources(
  before: SourceSnapshot,
  after: SourceSnapshot,
  ids: { alice: string; amy: string; bob: string; settlement: string; repayment: string },
): void {
  assertSettlementPreservesExpenseSources(before, after);
  expect(before.settlements).toHaveLength(1);
  expect(before.repayments).toHaveLength(1);
  expect(before.adjustments).toHaveLength(2);
  expect(before.repayments[0]).toMatchObject({
    payer_member_id: ids.amy,
    payee_member_id: ids.alice,
    amount_minor: '33',
    kind: 'settlement',
  });
  for (const key of ['settlements', 'repayments', 'adjustments'] as const)
    for (const row of before[key]) expect(after[key]).toContainEqual(row);
  expect(after.settlements).toHaveLength(2);
  expect(after.repayments).toHaveLength(2);
  expect(after.adjustments).toHaveLength(4);
  const settlement = after.settlements.filter((row) => row.id === ids.settlement);
  expect(settlement).toHaveLength(1);
  expect(settlement[0]).toMatchObject({
    debtor_member_id: ids.bob,
    creditor_member_id: ids.alice,
    currency_code: 'JPY',
    obligation_numerator: '100',
    obligation_denominator: '3',
    obligation_minor_unit: 0,
  });
  const repayment = after.repayments.filter((row) => row.id === ids.repayment);
  expect(repayment).toHaveLength(1);
  expect(repayment[0]).toMatchObject({
    payer_member_id: ids.bob,
    payee_member_id: ids.alice,
    currency_code: 'JPY',
    amount_minor: '34',
    minor_unit: 0,
    kind: 'settlement',
    settlement_id: ids.settlement,
  });
  const adjustments = after.adjustments.filter((row) => row.settlement_id === ids.settlement);
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
      {
        memberId: ids.bob,
        currencyCode: 'JPY',
        amount: { numerator: '-2', denominator: '3', minorUnit: 0 },
      },
      {
        memberId: ids.alice,
        currencyCode: 'JPY',
        amount: { numerator: '2', denominator: '3', minorUnit: 0 },
      },
    ],
  );
  for (const id of [ids.alice, ids.amy, ids.bob]) {
    expect(independentSplittingOracle.balance(after, id, 'JPY')).toEqual({
      numerator: '0',
      denominator: '1',
      minorUnit: 0,
    });
    expect(independentSplittingOracle.share(after, String(after.expenses[0]!.id), id)).toEqual({
      numerator: '100',
      denominator: '3',
      minorUnit: 0,
    });
  }
}

export function assertExactlyZeroSnackView(
  value: {
    arrangements: unknown[];
    balances: { memberId: string; currencyCode: string; netAmount: ExactAmount }[];
  },
  knownIds: readonly string[],
): void {
  expect(value.arrangements).toEqual([]);
  expect(Array.isArray(value.balances)).toBe(true);
  const seen = new Set<string>();
  for (const row of value.balances) {
    expect(knownIds).toContain(row.memberId);
    expect(row.currencyCode).toBe('JPY');
    expect(seen.has(row.memberId), 'Each currency/member balance is unique').toBe(false);
    seen.add(row.memberId);
    expect(row.netAmount.numerator).toBe('0');
    expect(row.netAmount.denominator).toBe('1');
    expect(row.netAmount.minorUnit).toBe(0);
  }
}

export async function assertSequentialSnackSettled(world: LedgerWorld): Promise<void> {
  expect(world.response!.status()).toBe(201);
  const creation = world.response!;
  const createdRecord: unknown = await creation.json();
  const before = world.get<SourceSnapshot>('splitting:before');
  const after = await snapshotSplittingSources(world);
  const ids = {
    alice: splittingMemberId(world, 'Alice'),
    amy: splittingMemberId(world, 'Amy'),
    bob: splittingMemberId(world, 'Bob'),
    settlement: world.get<string>('splitting:newSettlementId'),
    repayment: world.get<string>('splitting:newRepaymentId'),
  };
  assertSequentialSnackSources(before, after, ids);
  assertSequentialSettlementRecord(createdRecord, after, ids.settlement, ids.repayment);
  const base = `/api/trips/${splittingTripId(world)}`;
  const recordResponse = await callApi(world, 'GET', `${base}/settlements/${ids.settlement}`);
  expect(recordResponse.status()).toBe(200);
  assertSequentialSettlementRecord(
    await recordResponse.json(),
    after,
    ids.settlement,
    ids.repayment,
  );
  const settlement = after.settlements.find((row) => row.id === ids.settlement)!;
  const request = world.get<{ arrangementKey: string; accountingRevision: string }>(
    'splitting:settlementRequest',
  );
  expect(settlement.arrangement_key).toBe(request.arrangementKey);
  expect(String(settlement.source_revision)).toBe(request.accountingRevision);
  for (let read = 0; read < 2; read++) {
    const response = await callApi(world, 'GET', `${base}/settlement`);
    expect(response.status()).toBe(200);
    assertExactlyZeroSnackView(
      await response.json(),
      after.members.map((row) => String(row.id)),
    );
  }
  const expenseId = world.splitting.ids.expenses.get('點心')!;
  const expense = await callApi(world, 'GET', `${base}/expenses/${expenseId}`);
  expect(expense.status()).toBe(200);
  assertPreservedSnackView(await expense.json(), before, expenseId, [ids.alice, ids.amy, ids.bob]);
  const repayments = await callApi(world, 'GET', `${base}/repayments`);
  expect(repayments.status()).toBe(200);
  assertRepaymentFactItems(
    ((await repayments.json()) as { items: unknown }).items,
    after.repayments,
  );
  expect(
    await snapshotSplittingSources(world),
    'All Then reads must preserve history and sources',
  ).toEqual(after);
  world.response = creation;
}
