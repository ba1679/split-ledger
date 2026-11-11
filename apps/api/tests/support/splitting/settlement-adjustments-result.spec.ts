import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from './harness.js';
import { seedSplittingExpenses } from './expense-fixture.js';
import { captureCurrentAmyArrangement } from './current-arrangement-fixture.js';
import { requestAmySettlement } from './settle-amy-command.js';
import {
  assertSettlementAdjustmentPair,
  assertSettlementAdjustments,
  settlementAdjustmentsPhrase,
  signedMajorAdjustment,
} from './settlement-adjustments-result.js';

test('T093 signed fractions preserve direction and historical scales, reject rounded/duplicate/unbalanced pairs', () => {
  expect(settlementAdjustmentsPhrase).toBe('結清差額的兩位成員調整為：');
  const expected = ['1/3', '-1/3'].map((value, index) => ({
    memberId: String(index),
    currencyCode: 'JPY',
    amount: signedMajorAdjustment(value),
  }));
  const scaled = expected.map((row) => ({
    ...row,
    amount: {
      ...row.amount,
      numerator: (BigInt(row.amount.numerator) * 100n).toString(),
      minorUnit: 2,
    },
  }));
  expect(() => assertSettlementAdjustmentPair(scaled, expected)).not.toThrow();
  expect(signedMajorAdjustment('-0.25')).toEqual({
    numerator: '-25',
    denominator: '100',
    minorUnit: 0,
  });
  expect(() => signedMajorAdjustment('1/0')).toThrow();
  expect(() => assertSettlementAdjustmentPair([expected[0]!, expected[0]!], expected)).toThrow();
  expect(() =>
    assertSettlementAdjustmentPair(
      expected.map((row) => ({
        ...row,
        amount: { ...row.amount, numerator: row.amount.numerator.replace('-', '') },
      })),
      expected,
    ),
  ).toThrow();
  expect(() =>
    assertSettlementAdjustmentPair(
      expected.map((row) => ({
        ...row,
        amount: signedMajorAdjustment(row.memberId === '0' ? '0.33' : '-0.33'),
      })),
      expected,
    ),
  ).toThrow();
});

for (const paidAmount of ['33', '34'])
  test(`T093 real settlement ${paidAmount} adjustment pair`, async ({ world }) => {
    await seedSplittingExpenses(world, [
      { 項目: '點心', 幣別: 'JPY', 金額: '100', 付款人: 'Alice', 分攤者: 'Alice、Amy、Bob' },
    ]);
    await captureCurrentAmyArrangement(world);
    await requestAmySettlement(world, paidAmount);
    await runIsolatedStep(
      {
        phrase: settlementAdjustmentsPhrase,
        input: [
          { 成員: 'Amy', 幣別: 'JPY', 調整: paidAmount === '33' ? '1/3' : '-2/3' },
          { 成員: 'Alice', 幣別: 'JPY', 調整: paidAmount === '33' ? '-1/3' : '2/3' },
        ],
        execute: assertSettlementAdjustments,
      },
      world,
    );
  });
