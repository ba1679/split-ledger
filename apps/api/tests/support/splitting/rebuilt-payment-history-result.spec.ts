import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from './harness.js';
import { seedPaymentHistorySources } from './history-reconstruction-fixture.js';
import { changeSimplificationMode } from './change-simplification-command.js';
import {
  assertHistoryModeChange,
  assertRebuiltPaymentHistory,
  rebuiltPaymentHistoryPhrase,
} from './rebuilt-payment-history-result.js';
import type { SourceSnapshot } from './types.js';

test('T086 parameter-free history assertion rejects overwritten, missing or reapplied source facts', () => {
  expect(rebuiltPaymentHistoryPhrase).toBe('最新實付後的直接與簡化安排皆依來源重建');
  expect(rebuiltPaymentHistoryPhrase).not.toMatch(/[{}]/);
  const before: SourceSnapshot = {
    trips: [{ id: 'trip', simplify_debts: false, accounting_revision: '4', updated_at: 'before' }],
    members: [{ id: 'Amy', name: 'Amy' }],
    expenses: [{ id: 'expense', amount_minor: '100' }],
    shares: [{ expense_id: 'expense', member_id: 'Amy' }],
    repayments: [{ id: 'repayment', amount_minor: '33', paid_on: '2027-01-20' }],
    settlements: [{ id: 'settlement', obligation_numerator: '100', obligation_denominator: '3' }],
    adjustments: [{ settlement_id: 'settlement', numerator: '1', denominator: '3' }],
  };
  const after: SourceSnapshot = {
    ...structuredClone(before),
    trips: [
      { ...before.trips[0], simplify_debts: true, accounting_revision: '5', updated_at: 'after' },
    ],
  };
  expect(() => assertHistoryModeChange(before, after, true)).not.toThrow();
  for (const key of [
    'members',
    'expenses',
    'shares',
    'repayments',
    'settlements',
    'adjustments',
  ] as const) {
    expect(() => assertHistoryModeChange(before, { ...after, [key]: [] }, true)).toThrow();
    const changed = structuredClone(after);
    changed[key][0]!.extra = 'rewritten';
    expect(() => assertHistoryModeChange(before, changed, true)).toThrow();
  }
  expect(() => assertHistoryModeChange(before, after, false)).toThrow();
  expect(() => assertHistoryModeChange(before, { ...after, trips: before.trips }, false)).toThrow();
});

for (const mode of ['開啟', '關閉'])
  test(`T086 isolated history reconstruction in ${mode} mode`, async ({ world }) => {
    await seedPaymentHistorySources(world);
    await changeSimplificationMode(world, mode);
    await runIsolatedStep(
      {
        phrase: rebuiltPaymentHistoryPhrase,
        input: undefined,
        execute: assertRebuiltPaymentHistory,
      },
      world,
    );
  });
