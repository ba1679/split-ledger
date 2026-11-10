import { test, expect } from '../fixtures.js';
import { seedSplittingExpenses } from './expense-fixture.js';
import {
  captureCurrentAmyArrangement,
  type PendingSettlementSnapshot,
} from './current-arrangement-fixture.js';
import { armPartialAdjustmentFailure } from './transaction-fault-fixture.js';
import { requestAmySettlement } from './settle-amy-command.js';
import { runIsolatedStep } from './harness.js';
import {
  assertFailedSettlementResult,
  assertInternalSettlementError,
  assertSettlementRolledBack,
  failedSettlementPhrase,
} from './failed-settlement-result.js';
import type { SourceSnapshot } from './types.js';

test('T092 exact phrase and rollback assertions reject arbitrary failure, partial rows and revision drift', () => {
  expect(failedSettlementPhrase).toBe('結清失敗不留下任何部分帳務紀錄');
  const before: SourceSnapshot = {
    trips: [{ accounting_revision: '7' }],
    members: [],
    expenses: [],
    shares: [],
    repayments: [],
    settlements: [],
    adjustments: [],
  };
  const pending = { id: 'settlement', repaymentId: 'repayment' } as PendingSettlementSnapshot;
  expect(() =>
    assertSettlementRolledBack(before, structuredClone(before), pending, true),
  ).not.toThrow();
  expect(() => assertSettlementRolledBack(before, before, pending, false)).toThrow();
  for (const after of [
    { ...before, settlements: [{ id: pending.id }] },
    { ...before, repayments: [{ id: pending.repaymentId, settlement_id: pending.id }] },
    { ...before, adjustments: [{ settlement_id: pending.id }] },
    { ...before, trips: [{ accounting_revision: '8' }] },
  ])
    expect(() => assertSettlementRolledBack(before, after, pending, true)).toThrow();
});

test('T092 public internal error hides secrets and diagnostic fields', () => {
  expect(() =>
    assertInternalSettlementError(
      { code: 'INTERNAL_ERROR', message: 'Internal server error', requestId: 'trace' },
      ['secret'],
    ),
  ).not.toThrow();
  for (const body of [
    { code: 'INTERNAL_ERROR', message: 'secret' },
    { code: 'INTERNAL_ERROR', message: 'Failure', stack: 'private' },
    {
      code: 'INTERNAL_ERROR',
      message: 'Isolated settlement failure after the first adjustment insert',
    },
  ])
    expect(() => assertInternalSettlementError(body, ['secret'])).toThrow();
});

test('T092 isolated Then verifies true partial-insert fault, full rollback and authoritative GETs', async ({
  world,
}) => {
  await seedSplittingExpenses(world, [
    { 項目: '午餐', 幣別: 'JPY', 金額: '100', 付款人: 'Alice', 分攤者: 'Amy' },
  ]);
  await captureCurrentAmyArrangement(world);
  await armPartialAdjustmentFailure(world);
  await requestAmySettlement(world, '33');
  await runIsolatedStep(
    { phrase: failedSettlementPhrase, input: undefined, execute: assertFailedSettlementResult },
    world,
  );
});
