import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from './harness.js';
import { seedSplittingMembers } from './members-fixture.js';
import { seedExpenseValidationMembers } from './expense-validation-fixture.js';
import { assertRejectedSplittingOperation } from './rejection.js';
import {
  invalidExpensePhrase,
  invalidExpenseProblems,
  invalidExpenseRequest,
  requestInvalidSharedExpense,
} from './invalid-expense-command.js';

test('T034 exact registration and every problem preserve the intentionally invalid payload', () => {
  expect(invalidExpensePhrase).toBe('owner 嘗試以 {string} 保存共同支出');
  const members = { Alice: 'owner', Amy: 'amy', Carol: 'inactive', David: 'other-trip' };
  const expected: Record<string, unknown>[] = [
    { payerMemberId: 'owner' },
    { shareMemberIds: ['amy'] },
    { payerMemberId: 'owner', shareMemberIds: [] },
    { payerMemberId: 'owner', shareMemberIds: ['amy', 'amy'] },
    { payerMemberId: 'inactive', shareMemberIds: ['amy'] },
    { payerMemberId: 'owner', shareMemberIds: ['inactive'] },
    { payerMemberId: 'other-trip', shareMemberIds: ['amy'] },
    { payerMemberId: 'owner', shareMemberIds: ['other-trip'] },
  ];
  for (const [index, problem] of invalidExpenseProblems.entries()) {
    expect(invalidExpenseRequest(problem, 'reserved-id', members)).toEqual({
      id: 'reserved-id',
      item: '點心',
      currencyCode: 'JPY',
      amount: '100',
      spentOn: '2027-01-20',
      categoryId: null,
      ...expected[index],
    });
  }
  expect(() => invalidExpenseRequest('未知問題', 'id', members)).toThrow();
});

test('T034 isolated When submits each invalid command and preserves all sources', async ({
  world,
}) => {
  await seedSplittingMembers(world);
  await seedExpenseValidationMembers(world);
  for (const problem of invalidExpenseProblems) {
    await runIsolatedStep(
      {
        phrase: invalidExpensePhrase,
        input: problem,
        execute: requestInvalidSharedExpense,
      },
      world,
    );
    expect(world.get('splitting:reply')).toMatchObject({
      code: problem.startsWith('跨旅行') ? 'NOT_FOUND' : 'VALIDATION_ERROR',
    });
    await assertRejectedSplittingOperation(
      world,
      problem.startsWith('跨旅行') ? 'NOT_FOUND' : 'VALIDATION_ERROR',
    );
  }
});
