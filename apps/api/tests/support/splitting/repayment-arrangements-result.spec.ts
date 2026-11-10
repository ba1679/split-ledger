import { test, expect } from '../fixtures.js';
import {
  assertRepaymentArrangements,
  repaymentArrangementsPhrase,
} from './repayment-arrangements-result.js';
import { seedSplittingExpenses } from './expense-fixture.js';
import { seedSplittingRepayments } from './repayments-fixture.js';
import { recordIndependentRepayment } from './independent-repayment-command.js';
import { seedOverpaymentWarning } from './overpayment-warning-fixture.js';
import { submitConfirmedOverpayment } from './confirm-overpayment-command.js';
import { runIsolatedStep } from './harness.js';
import type { LedgerWorld } from '../world.js';

test('T079 rejects an original non-201 before any authoritative reread can overwrite it', async () => {
  for (const status of [409, 500]) {
    const world = { response: { status: () => status } } as unknown as LedgerWorld;
    await expect(assertRepaymentArrangements(world, [])).rejects.toThrow(
      /original independent repayment POST/,
    );
  }
});

test('T079 parameter-free DataTable registration retains its exact sentence', () => {
  expect(repaymentArrangementsPhrase).toBe('獨立還款後的付款安排如下：');
  expect(repaymentArrangementsPhrase).not.toMatch(/[{}]/);
});

for (const priorPayment of [false, true]) {
  test(`T079 isolated complete arrangement set after independent payment, prior=${priorPayment}`, async ({
    world,
  }) => {
    await seedSplittingExpenses(world, [
      { 項目: '午餐', 幣別: 'JPY', 金額: '1000', 付款人: 'Alice', 分攤者: 'Amy' },
      { 項目: '車票', 幣別: 'TWD', 金額: '300', 付款人: 'Alice', 分攤者: 'Amy' },
    ]);
    if (priorPayment)
      await seedSplittingRepayments(world, [
        { 付款人: 'Amy', 收款人: 'Alice', 幣別: 'JPY', 金額: '400', 日期: '2027-01-19' },
      ]);
    await recordIndependentRepayment(world, priorPayment ? '600' : '400');
    await runIsolatedStep(
      {
        phrase: repaymentArrangementsPhrase,
        input: [
          ...(priorPayment ? [] : [{ 付款人: 'Amy', 收款人: 'Alice', 幣別: 'JPY', 金額: '600' }]),
          { 付款人: 'Amy', 收款人: 'Alice', 幣別: 'TWD', 金額: '300' },
        ],
        execute: assertRepaymentArrangements,
      },
      world,
    );
  });
}

test('T079 isolated overpayment reverses debtor and creditor in the complete result', async ({
  world,
}) => {
  await seedOverpaymentWarning(world);
  await submitConfirmedOverpayment(world);
  expect(world.response!.status(), 'Server-issued overpayment confirmation must save').toBe(201);
  await runIsolatedStep(
    {
      phrase: repaymentArrangementsPhrase,
      input: [{ 付款人: 'Alice', 收款人: 'Amy', 幣別: 'JPY', 金額: '100' }],
      execute: assertRepaymentArrangements,
    },
    world,
  );
});
