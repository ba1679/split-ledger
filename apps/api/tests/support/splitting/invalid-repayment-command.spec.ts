import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from './harness.js';
import { seedSplittingExpenses } from './expense-fixture.js';
import { seedRepaymentValidationMembers } from './repayment-validation-fixture.js';
import { assertRejectedSplittingOperation } from './rejection.js';
import {
  invalidRepaymentPhrase,
  invalidRepaymentProblems,
  invalidRepaymentRequest,
  requestInvalidRepayment,
} from './invalid-repayment-command.js';

test('T049 exact registration and all eight invalid fields preserve the remaining payload', () => {
  expect(invalidRepaymentPhrase).toBe('owner 嘗試記錄 {string} 的獨立還款');
  const members = { Alice: 'owner', Amy: 'amy', Carol: 'inactive', David: 'other-trip' };
  const changes = [
    { payeeMemberId: 'amy' },
    { amount: '0' },
    { currencyCode: 'ZZZ' },
    { paidOn: '2027-02-30' },
    { payerMemberId: 'inactive' },
    { payeeMemberId: 'inactive' },
    { payerMemberId: 'other-trip' },
    { payeeMemberId: 'other-trip' },
  ];
  for (const [index, problem] of invalidRepaymentProblems.entries()) {
    expect(invalidRepaymentRequest(problem, 'reserved-id', members)).toEqual({
      id: 'reserved-id',
      payerMemberId: 'amy',
      payeeMemberId: 'owner',
      amount: '100',
      currencyCode: 'JPY',
      paidOn: '2027-01-20',
      ...changes[index],
    });
  }
  expect(() => invalidRepaymentRequest('未知問題', 'reserved-id', members)).toThrow();
});

test('T049 isolated When rejects all invalid repayments with no partial write', async ({
  world,
}) => {
  await seedSplittingExpenses(world, [
    { 項目: '午餐', 幣別: 'JPY', 金額: '600', 付款人: 'Alice', 分攤者: 'Amy' },
  ]);
  await seedRepaymentValidationMembers(world);
  for (const problem of invalidRepaymentProblems) {
    await runIsolatedStep(
      { phrase: invalidRepaymentPhrase, input: problem, execute: requestInvalidRepayment },
      world,
    );
    await assertRejectedSplittingOperation(
      world,
      problem.startsWith('跨旅行') ? 'NOT_FOUND' : 'VALIDATION_ERROR',
    );
  }
});
