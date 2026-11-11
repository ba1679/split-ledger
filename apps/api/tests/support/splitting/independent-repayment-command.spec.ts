import { test, expect } from '../fixtures.js';
import { seedSplittingExpenses } from './expense-fixture.js';
import { runIsolatedStep } from './harness.js';
import {
  independentRepaymentPhrase,
  independentRepaymentRequest,
  recordIndependentRepayment,
} from './independent-repayment-command.js';

test('T052 registration preserves quoted amount text and omits confirmation', () => {
  expect(independentRepaymentPhrase).toBe('owner 記錄 Amy 向 Alice 的 JPY {string} 獨立還款');
  for (const amount of ['400', '700', '00400.00', '0']) {
    expect(
      independentRepaymentRequest(amount, 'reserved-id', { Amy: 'amy', Alice: 'alice' }),
    ).toEqual({
      id: 'reserved-id',
      payerMemberId: 'amy',
      payeeMemberId: 'alice',
      amount,
      currencyCode: 'JPY',
      paidOn: '2027-01-20',
    });
  }
});

for (const [amount, status] of [
  ['400', 201],
  ['700', 409],
] as const) {
  test(`T052 isolated When records JPY ${amount} through one real POST`, async ({ world }) => {
    await seedSplittingExpenses(world, [
      { 項目: '午餐', 幣別: 'JPY', 金額: '600', 付款人: 'Alice', 分攤者: 'Amy' },
    ]);
    await runIsolatedStep(
      { phrase: independentRepaymentPhrase, input: amount, execute: recordIndependentRepayment },
      world,
    );
    expect(world.response!.status()).toBe(status);
    expect(world.get('splitting:repaymentRequest')).toMatchObject({
      id: world.get('splitting:repaymentId'),
      amount,
    });
    expect(world.get<Record<string, unknown>>('splitting:repaymentRequest')).not.toHaveProperty(
      'overpaymentConfirmation',
    );
  });
}
