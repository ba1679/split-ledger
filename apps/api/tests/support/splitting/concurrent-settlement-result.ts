import { sourceTimestamp } from './source-temporal.js';
import { expect, type APIResponse } from '@playwright/test';
import type { ExactAmount } from '@split-ledger/shared';
import { callApi } from '../seed.js';
import type { LedgerWorld } from '../world.js';
import { independentSplittingOracle, snapshotSplittingSources } from './expense-fixture.js';
import { splittingTripId } from './members-fixture.js';
import { historicalRepaymentProjection } from './preserved-settlement-history.js';
import type { amySettlementRequest } from './settle-amy-command.js';
import type { SourceSnapshot } from './types.js';

type Command = ReturnType<typeof amySettlementRequest>;

export const concurrentSettlementResultPhrase = '同一安排最多只保存一次完整結清';

/** Validate both competing commands against the durable, atomic winning result. */
export function assertSingleConcurrentSettlement(
  before: SourceSnapshot,
  after: SourceSnapshot,
  commands: readonly Command[],
  statuses: readonly number[],
  replies: readonly Record<string, unknown>[],
  arrivals: readonly string[],
): number {
  expect(commands).toHaveLength(2);
  expect(commands[1]).toMatchObject({
    arrangementKey: commands[0]!.arrangementKey,
    accountingRevision: commands[0]!.accountingRevision,
    debtorMemberId: commands[0]!.debtorMemberId,
    creditorMemberId: commands[0]!.creditorMemberId,
    currencyCode: commands[0]!.currencyCode,
    expectedAmount: commands[0]!.expectedAmount,
  });
  expect(statuses).toHaveLength(2);
  expect(replies).toHaveLength(2);
  expect(new Set(commands.flatMap((row) => [row.id, row.repaymentId])).size).toBe(4);
  expect([...arrivals].sort(), 'Both commands must reach the real pre-lock boundary').toEqual(
    commands.map((row) => row.id).sort(),
  );
  expect([...statuses].sort()).toEqual([201, 409]);
  const winnerIndex = statuses.indexOf(201);
  const winner = commands[winnerIndex]!;
  const loser = commands[1 - winnerIndex]!;
  expect(['ACCOUNTING_REVISION_CONFLICT', 'ARRANGEMENT_NOT_FOUND']).toContain(
    replies[1 - winnerIndex]!.code,
  );
  for (const key of ['members', 'expenses', 'shares'] as const)
    expect(after[key]).toEqual(before[key]);
  expect(after.trips).toHaveLength(1);
  expect(before.trips).toHaveLength(1);
  expect(String(after.trips[0]!.accounting_revision)).toBe(
    (BigInt(String(before.trips[0]!.accounting_revision)) + 1n).toString(),
  );
  expect({
    ...after.trips[0],
    accounting_revision: before.trips[0]!.accounting_revision,
    updated_at: before.trips[0]!.updated_at,
  }).toEqual(before.trips[0]);
  for (const key of ['settlements', 'repayments', 'adjustments'] as const) {
    const original = before[key];
    const added = after[key].filter((row) =>
      key === 'adjustments'
        ? row.settlement_id === winner.id
        : row.id === (key === 'settlements' ? winner.id : winner.repaymentId),
    );
    expect(added).toHaveLength(key === 'adjustments' ? 2 : 1);
    expect(after[key].filter((row) => !added.includes(row))).toEqual(original);
    expect(
      after[key].some(
        (row) =>
          row.id === loser.id || row.id === loser.repaymentId || row.settlement_id === loser.id,
      ),
      'The losing UUIDs must leave no partial rows',
    ).toBe(false);
  }
  const settlement = after.settlements.find((row) => row.id === winner.id)!;
  const repayment = after.repayments.find((row) => row.id === winner.repaymentId)!;
  expect(settlement).toMatchObject({
    trip_id: before.trips[0]!.id,
    owner_id: before.trips[0]!.owner_id,
    debtor_member_id: winner.debtorMemberId,
    creditor_member_id: winner.creditorMemberId,
    currency_code: winner.currencyCode,
    arrangement_key: winner.arrangementKey,
    simplify_debts: before.trips[0]!.simplify_debts,
  });
  expect(String(settlement.source_revision)).toBe(winner.accountingRevision);
  expect(
    independentSplittingOracle.equal(
      {
        numerator: String(settlement.obligation_numerator),
        denominator: String(settlement.obligation_denominator),
        minorUnit: Number(settlement.obligation_minor_unit),
      },
      winner.expectedAmount,
    ),
  ).toBe(true);
  expect(repayment).toMatchObject({
    trip_id: before.trips[0]!.id,
    owner_id: before.trips[0]!.owner_id,
    payer_member_id: winner.debtorMemberId,
    payee_member_id: winner.creditorMemberId,
    currency_code: 'JPY',
    minor_unit: 0,
    kind: 'settlement',
    settlement_id: winner.id,
  });
  expect(String(repayment.amount_minor)).toBe(winner.paidAmount);
  expect(historicalRepaymentProjection(repayment).paidOn).toBe(winner.paidOn);
  const adjustments = after.adjustments.filter((row) => row.settlement_id === winner.id);
  expect(adjustments.map((row) => row.member_id).sort()).toEqual(
    [winner.debtorMemberId, winner.creditorMemberId].sort(),
  );
  const obligation = winner.expectedAmount;
  const difference =
    BigInt(obligation.numerator) -
    BigInt(winner.paidAmount) *
      10n ** BigInt(obligation.minorUnit) *
      BigInt(obligation.denominator);
  for (const row of adjustments) {
    expect(row).toMatchObject({
      owner_id: before.trips[0]!.owner_id,
      trip_id: before.trips[0]!.id,
      currency_code: 'JPY',
    });
    const numerator = BigInt(String(row.numerator));
    const denominator = BigInt(String(row.denominator));
    expect(denominator > 0n).toBe(true);
    let a = numerator < 0n ? -numerator : numerator;
    let b = denominator;
    while (b) [a, b] = [b, a % b];
    expect(a, 'Adjustment must be reduced, including zero as 0/1').toBe(1n);
    const expected: ExactAmount = {
      numerator: (row.member_id === winner.debtorMemberId ? difference : -difference).toString(),
      denominator: obligation.denominator,
      minorUnit: obligation.minorUnit,
    };
    expect(
      independentSplittingOracle.equal(
        {
          numerator: String(row.numerator),
          denominator: String(row.denominator),
          minorUnit: Number(row.minor_unit),
        },
        expected,
      ),
    ).toBe(true);
  }
  for (const member of after.members) {
    expect(independentSplittingOracle.balance(after, String(member.id), 'JPY').numerator).toBe('0');
  }

  return winnerIndex;
}

export async function assertConcurrentSettlementResult(world: LedgerWorld): Promise<void> {
  const commands = world.get<Command[]>('splitting:concurrentCommands');
  const responses = world.get<APIResponse[]>('splitting:concurrentResponses');
  const replies = world.get<Record<string, unknown>[]>('splitting:concurrentReplies');
  const before = world.get<SourceSnapshot>('splitting:before');
  const after = await snapshotSplittingSources(world);
  const winnerIndex = assertSingleConcurrentSettlement(
    before,
    after,
    commands,
    responses.map((response) => response.status()),
    replies,
    world.get<string[]>('splitting:concurrentBarrierArrivals'),
  );
  const winner = commands[winnerIndex]!;
  const loser = commands[1 - winnerIndex]!;
  const tripId = splittingTripId(world);
  const payment = historicalRepaymentProjection(
    after.repayments.find((row) => row.id === winner.repaymentId)!,
  );
  const row = after.settlements.find((entry) => entry.id === winner.id)!;
  const expected = {
    id: winner.id,
    tripId,
    arrangementKey: winner.arrangementKey,
    sourceRevision: winner.accountingRevision,
    simplifyDebts: row.simplify_debts,
    debtorMemberId: winner.debtorMemberId,
    creditorMemberId: winner.creditorMemberId,
    currencyCode: 'JPY',
    obligation: {
      numerator: String(row.obligation_numerator),
      denominator: String(row.obligation_denominator),
      minorUnit: Number(row.obligation_minor_unit),
    },
    repayment: payment,
    adjustments: after.adjustments
      .filter((entry) => entry.settlement_id === winner.id)
      .map((entry) => ({
        memberId: entry.member_id,
        currencyCode: entry.currency_code,
        amount: {
          numerator: String(entry.numerator),
          denominator: String(entry.denominator),
          minorUnit: Number(entry.minor_unit),
        },
      }))
      .sort((a, b) => String(a.memberId).localeCompare(String(b.memberId))),
    createdAt: sourceTimestamp(row.created_at),
  };
  const sortedRecord = (record: Record<string, unknown>) => ({
    ...record,
    adjustments: [...(record.adjustments as { memberId: string }[])].sort((a, b) =>
      a.memberId.localeCompare(b.memberId),
    ),
  });
  expect(sortedRecord(replies[winnerIndex]!)).toEqual(expected);
  for (const [path, expectedBody] of [
    [`settlements/${winner.id}`, expected],
    [`repayments/${winner.repaymentId}`, payment],
  ] as const) {
    const response = await callApi(world, 'GET', `/api/trips/${tripId}/${path}`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(path.startsWith('settlements') ? sortedRecord(body) : body).toEqual(expectedBody);
  }
  for (const path of [`settlements/${loser.id}`, `repayments/${loser.repaymentId}`]) {
    const response = await callApi(world, 'GET', `/api/trips/${tripId}/${path}`);
    expect(response.status()).toBe(404);
    expect((await response.json()).code).toBe('NOT_FOUND');
  }
  const response = await callApi(world, 'GET', `/api/trips/${tripId}/settlement`);
  expect(response.status()).toBe(200);
  const view = await response.json();
  expect(view.accountingRevision).toBe(String(after.trips[0]!.accounting_revision));
  expect(view.arrangements, 'No unpaid or reverse tail may remain').toEqual([]);
  expect(Array.isArray(view.balances)).toBe(true);
  expect(new Set(view.balances.map((balance: { memberId: string }) => balance.memberId)).size).toBe(
    view.balances.length,
  );
  for (const balance of view.balances) {
    expect(after.members.some((member) => member.id === balance.memberId)).toBe(true);
    expect(balance.currencyCode).toBe('JPY');
    expect(balance.netAmount).toEqual({ numerator: '0', denominator: '1', minorUnit: 0 });
  }
  expect(await snapshotSplittingSources(world), 'All Then verification must be read-only').toEqual(
    after,
  );
}
