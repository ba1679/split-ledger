import { sourceTimestamp } from './source-temporal.js';
import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import { callApi } from '../seed.js';
import { snapshotSplittingSources } from './expense-fixture.js';
import type { LostSettlementCommand } from './lost-settlement-fixture.js';
import { splittingTripId } from './members-fixture.js';
import { historicalRepaymentProjection } from './preserved-settlement-history.js';
import type { SourceSnapshot } from './types.js';

export const recoveredSettlementResultPhrase = '查證取得同一份結清與實付紀錄';

export function assertRecoveredSettlementRecord(
  actual: Record<string, unknown>,
  before: SourceSnapshot,
  command: LostSettlementCommand,
): void {
  expect(before.settlements).toHaveLength(1);
  expect(before.repayments).toHaveLength(1);
  expect(before.adjustments).toHaveLength(2);
  const settlement = before.settlements[0]!;
  const repayment = before.repayments[0]!;
  expect(settlement).toMatchObject({
    id: command.id,
    debtor_member_id: command.debtorMemberId,
    creditor_member_id: command.creditorMemberId,
    currency_code: 'JPY',
    obligation_numerator: '100',
    obligation_denominator: '3',
    obligation_minor_unit: 0,
    arrangement_key: command.arrangementKey,
    source_revision: command.accountingRevision,
  });
  const payment = historicalRepaymentProjection(repayment);
  expect(payment).toMatchObject({
    id: command.repaymentId,
    payerMemberId: command.debtorMemberId,
    payeeMemberId: command.creditorMemberId,
    currencyCode: 'JPY',
    amount: '33',
    minorUnit: 0,
    paidOn: command.paidOn,
    kind: 'settlement',
    settlementId: command.id,
  });
  const adjustments = before.adjustments.map((row) => {
    expect(row.settlement_id).toBe(command.id);

    return {
      memberId: row.member_id,
      currencyCode: row.currency_code,
      amount: {
        numerator: String(row.numerator),
        denominator: String(row.denominator),
        minorUnit: Number(row.minor_unit),
      },
    };
  });
  expect(adjustments).toEqual(
    expect.arrayContaining([
      {
        memberId: command.debtorMemberId,
        currencyCode: 'JPY',
        amount: { numerator: '1', denominator: '3', minorUnit: 0 },
      },
      {
        memberId: command.creditorMemberId,
        currencyCode: 'JPY',
        amount: { numerator: '-1', denominator: '3', minorUnit: 0 },
      },
    ]),
  );
  const sort = (rows: { memberId: unknown }[]) =>
    rows.sort((a, b) => String(a.memberId).localeCompare(String(b.memberId)));
  expect(Array.isArray(actual.adjustments)).toBe(true);
  expect({
    ...actual,
    adjustments: sort([...(actual.adjustments as { memberId: unknown }[])]),
  }).toEqual({
    id: command.id,
    tripId: settlement.trip_id,
    arrangementKey: command.arrangementKey,
    sourceRevision: command.accountingRevision,
    simplifyDebts: settlement.simplify_debts,
    debtorMemberId: command.debtorMemberId,
    creditorMemberId: command.creditorMemberId,
    currencyCode: command.currencyCode,
    obligation: command.expectedAmount,
    repayment: payment,
    adjustments: sort(adjustments),
    createdAt: sourceTimestamp(settlement.created_at),
  });
}

/** Only reads the saved IDs; recovery must never replay the settlement command. */
export async function assertRecoveredSettlement(world: LedgerWorld): Promise<void> {
  const before = world.get<SourceSnapshot>('splitting:lostSettlementSnapshot');
  const command = world.get<LostSettlementCommand>('splitting:lostSettlementCommand');
  expect(world.response!.status()).toBe(200);
  assertRecoveredSettlementRecord(await world.response!.json(), before, command);
  expect(
    await snapshotSplittingSources(world),
    'Recovery GET must preserve all source rows',
  ).toEqual(before);
  const tripId = splittingTripId(world);
  const repayment = await callApi(
    world,
    'GET',
    `/api/trips/${tripId}/repayments/${command.repaymentId}`,
  );
  expect(repayment.status()).toBe(200);
  expect(await repayment.json()).toEqual(historicalRepaymentProjection(before.repayments[0]!));
  const again = await callApi(world, 'GET', `/api/trips/${tripId}/settlements/${command.id}`);
  expect(again.status()).toBe(200);
  assertRecoveredSettlementRecord(await again.json(), before, command);
  expect(
    await snapshotSplittingSources(world),
    'Verification must not create a second payment or adjustment',
  ).toEqual(before);
}
