import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from './harness.js';
import { seedSplittingExpenses } from './expense-fixture.js';
import { seedExpenseValidationMembers } from './expense-validation-fixture.js';
import {
  invalidExpenseUpdateProblems,
  invalidExpenseUpdatePhrase,
  invalidExpenseUpdateRequest,
  updateInvalidExpense,
} from './update-invalid-expense-command.js';
import { assertRejectedSplittingOperation } from './rejection.js';

const ids = { amyId: 'amy-id', carolId: 'inactive-carol-id', davidId: 'other-trip-david-id' };
const expectedRequests = [
  { shareMemberIds: [] },
  { shareMemberIds: [ids.amyId, ids.amyId] },
  { payerMemberId: ids.carolId },
  { shareMemberIds: [ids.carolId] },
  { payerMemberId: ids.davidId },
  { shareMemberIds: [ids.davidId] },
];

for (const [index, problem] of invalidExpenseUpdateProblems.entries()) {
  test(`T035 parameter ${problem} sends only its partial member patch`, () => {
    expect(invalidExpenseUpdateRequest(problem, ids)).toEqual(expectedRequests[index]);
  });

  test(`T035 isolated invalid existing expense update: ${problem}`, async ({ world }) => {
    await seedSplittingExpenses(world, [
      { 項目: '晚餐', 幣別: 'JPY', 金額: '300', 付款人: 'Alice', 分攤者: 'Alice、Amy、Bob' },
    ]);
    await seedExpenseValidationMembers(world);
    await runIsolatedStep(
      {
        phrase: invalidExpenseUpdatePhrase,
        input: problem,
        execute: updateInvalidExpense,
      },
      world,
    );
    expect(Object.keys(world.get<object>('splitting:expenseRequest'))).toHaveLength(1);
    expect(world.get('splitting:expenseId')).toBe(world.splitting.ids.expenses.get('晚餐'));
    await assertRejectedSplittingOperation(
      world,
      problem.startsWith('跨旅行') ? 'NOT_FOUND' : 'VALIDATION_ERROR',
    );
  });
}

test('T035 rejects values outside the authoritative six update problems', () => {
  expect(invalidExpenseUpdatePhrase).toBe('owner 嘗試以 {string} 修改既有共同支出');
  expect(() => invalidExpenseUpdateRequest('只有付款人', ids)).toThrow('Unsupported');
  expect(() => invalidExpenseUpdateRequest('只有分攤者', ids)).toThrow('Unsupported');
});
