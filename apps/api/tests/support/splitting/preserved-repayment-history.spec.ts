import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from './harness.js';
import { seedSplittingExpenses } from './expense-fixture.js';
import { seedSplittingRepayments } from './repayments-fixture.js';
import { changeOriginalExpenseToEightHundred } from './change-expense-to-eight-hundred-command.js';
import { deleteOriginalPaidExpense } from './delete-paid-expense-command.js';
import {
  assertPreservedRepaymentHistory,
  assertRepaymentHistoryRows,
  preservedRepaymentHistoryPhrase,
} from './preserved-repayment-history.js';
import type { SourceSnapshot } from './types.js';

test('T063 parameter-free history assertion rejects changes to each payment column and linked history', () => {
  expect(preservedRepaymentHistoryPhrase).toBe('已記錄還款保持原事實');
  expect(preservedRepaymentHistoryPhrase).not.toMatch(/[{}]/);
  const before: SourceSnapshot = {
    trips: [],
    members: [],
    expenses: [],
    shares: [],
    repayments: [
      {
        id: 'r',
        payer_member_id: 'Amy',
        payee_member_id: 'Alice',
        amount_minor: '400',
        minor_unit: 0,
        currency_code: 'JPY',
        paid_on: '2027-01-20',
        kind: 'settlement',
        settlement_id: 's',
      },
    ],
    settlements: [{ id: 's', obligation_numerator: '600' }],
    adjustments: [{ settlement_id: 's', numerator: '200' }],
  };
  expect(() => assertRepaymentHistoryRows(before, structuredClone(before))).not.toThrow();
  for (const key of Object.keys(before.repayments[0]!)) {
    const changed = structuredClone(before);
    changed.repayments[0]![key] = 'altered';
    expect(() => assertRepaymentHistoryRows(before, changed)).toThrow();
  }
  for (const key of ['repayments', 'settlements', 'adjustments'] as const)
    expect(() => assertRepaymentHistoryRows(before, { ...before, [key]: [] })).toThrow();
});

for (const [name, command] of [
  ['PATCH', changeOriginalExpenseToEightHundred],
  ['DELETE', deleteOriginalPaidExpense],
] as const) {
  test(`T063 isolated preserved payment Then after ${name}`, async ({ world }) => {
    await seedSplittingExpenses(world, [
      { 項目: '晚餐', 幣別: 'JPY', 金額: '1000', 付款人: 'Alice', 分攤者: 'Amy' },
    ]);
    await seedSplittingRepayments(world, [
      { 付款人: 'Amy', 收款人: 'Alice', 幣別: 'JPY', 金額: '400', 日期: '2027-01-20' },
    ]);
    await command(world);
    await runIsolatedStep(
      {
        phrase: preservedRepaymentHistoryPhrase,
        input: undefined,
        execute: assertPreservedRepaymentHistory,
      },
      world,
    );
  });
}
