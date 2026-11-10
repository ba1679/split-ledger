import { test, expect } from '../fixtures.js';
import {
  captureCurrentAmyArrangement,
  type PendingSettlementSnapshot,
} from './current-arrangement-fixture.js';
import { seedSplittingExpenses } from './expense-fixture.js';
import { runIsolatedStep } from './harness.js';
import {
  amySettlementRequest,
  assertAmySettlementAtomicOutcome,
  requestAmySettlement,
  settleAmyPhrase,
} from './settle-amy-command.js';
import type { SourceSnapshot } from './types.js';

test('T053 atomic outcome detects partial commits and any failed-command source change', () => {
  const before: SourceSnapshot = {
    trips: [{ id: 'trip', accounting_revision: '7' }],
    members: [],
    expenses: [],
    shares: [],
    repayments: [],
    settlements: [],
    adjustments: [],
  };
  const pending: PendingSettlementSnapshot = {
    id: 'settlement',
    repaymentId: 'repayment',
    arrangementKey: 'key',
    accountingRevision: '7',
    debtorMemberId: 'amy',
    creditorMemberId: 'alice',
    currencyCode: 'JPY',
    expectedAmount: { numerator: '100', denominator: '3', minorUnit: 0 },
  };
  const after: SourceSnapshot = {
    ...before,
    trips: [{ id: 'trip', accounting_revision: '8' }],
    settlements: [{ id: pending.id }],
    repayments: [{ id: pending.repaymentId, settlement_id: pending.id, kind: 'settlement' }],
    adjustments: [
      { settlement_id: pending.id, member_id: 'amy' },
      { settlement_id: pending.id, member_id: 'alice' },
    ],
  };
  expect(() => assertAmySettlementAtomicOutcome(before, after, pending, 201)).not.toThrow();
  for (const missing of ['settlements', 'repayments', 'adjustments'] as const)
    expect(() =>
      assertAmySettlementAtomicOutcome(before, { ...after, [missing]: [] }, pending, 201),
    ).toThrow();
  for (const status of [400, 409, 500]) {
    expect(() => assertAmySettlementAtomicOutcome(before, before, pending, status)).not.toThrow();
    expect(() => assertAmySettlementAtomicOutcome(before, after, pending, status)).toThrow();
    expect(() =>
      assertAmySettlementAtomicOutcome(before, { ...before, trips: after.trips }, pending, status),
    ).toThrow();
  }
});

test('T053 exact registration preserves raw rational snapshot and every paid string', () => {
  expect(settleAmyPhrase).toBe('owner 以 JPY {string} 結清 Amy 向 Alice 的安排');
  const pending: PendingSettlementSnapshot = {
    id: 'reserved-settlement',
    repaymentId: 'reserved-repayment',
    arrangementKey: 'original-key',
    accountingRevision: '7',
    debtorMemberId: 'amy',
    creditorMemberId: 'alice',
    currencyCode: 'JPY',
    expectedAmount: { numerator: '100', denominator: '3', minorUnit: 0 },
  };
  for (const paidAmount of ['33', '34', '0', '-1', '33.3', 'invalid', '']) {
    const body = amySettlementRequest(pending, paidAmount);
    expect(body).toEqual({ ...pending, paidAmount, paidOn: '2027-01-20' });
    expect(body.expectedAmount).not.toBe(pending.expectedAmount);
    expect(body).not.toHaveProperty('roundingStrategy');
  }
});

test('T053 isolated When posts the reserved settlement and captures the real reply', async ({
  world,
}) => {
  await seedSplittingExpenses(world, [
    { 項目: '點心', 幣別: 'JPY', 金額: '100', 付款人: 'Alice', 分攤者: 'Alice、Amy、Bob' },
  ]);
  await captureCurrentAmyArrangement(world);
  const pending = world.get<PendingSettlementSnapshot>('splitting:settlementSnapshot');
  await runIsolatedStep(
    { phrase: settleAmyPhrase, input: '33', execute: requestAmySettlement },
    world,
  );
  expect(world.response!.status(), 'The settlement command must be provided by the product').toBe(
    201,
  );
  expect(world.get('splitting:settlementRequest')).toEqual({
    ...pending,
    paidAmount: '33',
    paidOn: '2027-01-20',
  });
  expect(world.get('splitting:reply')).toEqual(await world.response!.json());
  expect(world.get('splitting:settlementId')).toBe(pending.id);
  expect(world.get('splitting:settlementRepaymentId')).toBe(pending.repaymentId);
});
