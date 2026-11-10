import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import { callApi } from '../seed.js';
import { snapshotSplittingSources } from './expense-fixture.js';
import { splittingTripId } from './members-fixture.js';
import { requireProductColumns } from './schema.js';
import type { PendingSettlementSnapshot } from './current-arrangement-fixture.js';

export const noRoundingPolicyPhrase = '結清紀錄沒有取整方式欄位';

// Contract-defined complete shapes also exclude disguised policy/metadata fields.
const persistedColumns = {
  settlements: [
    'id',
    'owner_id',
    'trip_id',
    'debtor_member_id',
    'creditor_member_id',
    'currency_code',
    'obligation_numerator',
    'obligation_denominator',
    'obligation_minor_unit',
    'arrangement_key',
    'source_revision',
    'simplify_debts',
    'created_at',
  ],
  repayments: [
    'id',
    'owner_id',
    'trip_id',
    'payer_member_id',
    'payee_member_id',
    'amount_minor',
    'currency_code',
    'minor_unit',
    'paid_on',
    'kind',
    'settlement_id',
    'created_at',
  ],
  settlement_adjustments: [
    'settlement_id',
    'owner_id',
    'trip_id',
    'member_id',
    'currency_code',
    'numerator',
    'denominator',
    'minor_unit',
  ],
} as const;

export function assertOnlyContractFields(value: unknown, fields: readonly string[]): void {
  expect(value).not.toBeNull();
  expect(typeof value).toBe('object');
  expect(Array.isArray(value)).toBe(false);
  expect(Object.keys(value as object).sort()).toEqual([...fields].sort());
}

export function assertSettlementHasNoPolicy(record: unknown): void {
  assertOnlyContractFields(record, [
    'id',
    'tripId',
    'arrangementKey',
    'sourceRevision',
    'simplifyDebts',
    'debtorMemberId',
    'creditorMemberId',
    'currencyCode',
    'obligation',
    'repayment',
    'adjustments',
    'createdAt',
  ]);
  const result = record as Record<string, unknown>;
  assertOnlyContractFields(result.obligation, ['numerator', 'denominator', 'minorUnit']);
  assertOnlyContractFields(result.repayment, [
    'id',
    'tripId',
    'payerMemberId',
    'payeeMemberId',
    'amount',
    'currencyCode',
    'minorUnit',
    'paidOn',
    'kind',
    'settlementId',
    'createdAt',
  ]);
  expect(Array.isArray(result.adjustments)).toBe(true);
  expect(result.adjustments).toHaveLength(2);
  for (const adjustment of result.adjustments as Record<string, unknown>[]) {
    assertOnlyContractFields(adjustment, ['memberId', 'currencyCode', 'amount']);
    assertOnlyContractFields(adjustment.amount, ['numerator', 'denominator', 'minorUnit']);
  }
}

/** Read-only verification: absence must hold in schema and actual immutable records. */
export async function assertNoRoundingPolicy(world: LedgerWorld): Promise<void> {
  expect(world.response!.status(), 'Settlement creation must succeed').toBe(201);
  const pending = world.get<PendingSettlementSnapshot>('splitting:settlementSnapshot');
  const reply: unknown = await world.response!.json();
  assertSettlementHasNoPolicy(reply);
  const beforeReads = await snapshotSplittingSources(world);
  for (const [table, columns] of Object.entries(persistedColumns)) {
    await requireProductColumns(world, table, columns);
    const schema = await world.db.query<{ column_name: string }>(
      'SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2',
      ['public', table],
    );
    expect(
      schema.rows.map((row) => row.column_name).sort(),
      `${table} has no policy storage`,
    ).toEqual([...columns].sort());
  }
  const settlements = beforeReads.settlements.filter((row) => row.id === pending.id);
  const repayments = beforeReads.repayments.filter((row) => row.id === pending.repaymentId);
  const adjustments = beforeReads.adjustments.filter((row) => row.settlement_id === pending.id);
  expect(settlements).toHaveLength(1);
  expect(repayments).toHaveLength(1);
  expect(adjustments).toHaveLength(2);
  assertOnlyContractFields(settlements[0], persistedColumns.settlements);
  assertOnlyContractFields(repayments[0], persistedColumns.repayments);
  expect(repayments[0]).toMatchObject({ kind: 'settlement', settlement_id: pending.id });
  for (const row of adjustments)
    assertOnlyContractFields(row, persistedColumns.settlement_adjustments);
  const tripId = splittingTripId(world);
  const response = await callApi(world, 'GET', `/api/trips/${tripId}/settlements/${pending.id}`);
  expect(response.status()).toBe(200);
  const record: unknown = await response.json();
  assertSettlementHasNoPolicy(record);
  expect(record).toEqual({
    ...(reply as Record<string, unknown>),
    adjustments: expect.arrayContaining((reply as { adjustments: unknown[] }).adjustments),
  });
  const repaymentResponse = await callApi(
    world,
    'GET',
    `/api/trips/${tripId}/repayments/${pending.repaymentId}`,
  );
  expect(repaymentResponse.status()).toBe(200);
  expect(await repaymentResponse.json()).toEqual((record as Record<string, unknown>).repayment);
  expect(await snapshotSplittingSources(world), 'Then must not mutate stored facts').toEqual(
    beforeReads,
  );
}
