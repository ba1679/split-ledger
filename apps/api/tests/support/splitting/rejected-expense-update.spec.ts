import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from './harness.js';
import { seedSplittingExpenses } from './expense-fixture.js';
import { seedExpenseValidationMembers } from './expense-validation-fixture.js';
import {
  invalidExpenseUpdateProblems,
  updateInvalidExpense,
} from './update-invalid-expense-command.js';
import {
  assertUnchangedExpenseProjection,
  assertRejectedExpenseUpdate,
  rejectedExpenseUpdatePhrase,
} from './rejected-expense-update.js';

test('T064 registers the exact parameter-free Then', () => {
  expect(rejectedExpenseUpdatePhrase).toBe('支出修改被拒絕且舊分攤與安排完全保留');
  expect(rejectedExpenseUpdatePhrase).not.toMatch(/[{}]/);
});

for (const problem of invalidExpenseUpdateProblems) {
  test(`T064 isolated unchanged rejection: ${problem}`, async ({ world }) => {
    await seedSplittingExpenses(world, [
      { 項目: '晚餐', 幣別: 'JPY', 金額: '300', 付款人: 'Alice', 分攤者: 'Alice、Amy、Bob' },
    ]);
    await seedExpenseValidationMembers(world);
    await updateInvalidExpense(world, problem);
    await runIsolatedStep(
      {
        phrase: rejectedExpenseUpdatePhrase,
        input: undefined,
        execute: assertRejectedExpenseUpdate,
      },
      world,
    );
  });
}

test('T064 unchanged expense projection retains SQL calendar date and timestamp milliseconds', () => {
  const stamp = '2027-01-20T12:00:00.674Z';
  const row = {
    id: 'expense',
    trip_id: 'trip',
    item: '晚餐',
    payer_member_id: 'alice',
    currency_code: 'JPY',
    minor_unit: 0,
    amount_minor: '100',
    category_id: null,
    spent_on: new Date(2027, 0, 20),
    created_at: new Date(stamp),
    updated_at: new Date(stamp),
  };
  const before = {
    trips: [],
    members: [],
    expenses: [row],
    shares: [{ expense_id: 'expense', member_id: 'amy' }],
    repayments: [],
    settlements: [],
    adjustments: [],
  };
  const actual = {
    id: 'expense',
    tripId: 'trip',
    item: '晚餐',
    payerMemberId: 'alice',
    currencyCode: 'JPY',
    minorUnit: 0,
    amount: '100',
    category: null,
    spentOn: '2027-01-20',
    createdAt: stamp,
    updatedAt: stamp,
    shares: [{ memberId: 'amy', amount: { numerator: '100', denominator: '1', minorUnit: 0 } }],
  };
  expect(() => assertUnchangedExpenseProjection(actual, row, before)).not.toThrow();
  for (const wrong of [
    { ...actual, spentOn: '2027-01-19' },
    { ...actual, createdAt: '2027-01-20T12:00:00.000Z' },
    { ...actual, updatedAt: '2027-01-20T12:00:00.000Z' },
  ])
    expect(() => assertUnchangedExpenseProjection(wrong, row, before)).toThrow();
});
