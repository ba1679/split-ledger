import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from './harness.js';
import { seedSplittingExpenses } from './expense-fixture.js';
import { seedSplittingRepayments } from './repayments-fixture.js';
import { recordIndependentRepayment } from './independent-repayment-command.js';
import {
  assertPreservedOtherCurrencyRows,
  assertPreservedOtherCurrencySources,
  preservedOtherCurrencySourcesPhrase,
} from './preserved-other-currency-sources.js';
import type { SourceSnapshot } from './types.js';

test('T076 parameter-free assertion rejects rewritten history and other-currency sources', () => {
  expect(preservedOtherCurrencySourcesPhrase).toBe('先前還款與其他幣別來源保持不變');
  expect(preservedOtherCurrencySourcesPhrase).not.toMatch(/[{}]/);
  const before: SourceSnapshot = {
    trips: [],
    members: [],
    expenses: [{ id: 'e', currency_code: 'TWD', amount_minor: '30000' }],
    shares: [{ expense_id: 'e', member_id: 'Amy' }],
    repayments: [{ id: 'r', currency_code: 'JPY', amount_minor: '400', paid_on: '2027-01-19' }],
    settlements: [{ id: 's', currency_code: 'TWD' }],
    adjustments: [{ settlement_id: 's', currency_code: 'TWD', numerator: '0' }],
  };
  const after = { ...structuredClone(before), repayments: structuredClone([...before.repayments]) };
  after.repayments.push({ id: 'new', currency_code: 'JPY', amount_minor: '600' });
  expect(() => assertPreservedOtherCurrencyRows(before, after, 'JPY')).not.toThrow();
  for (const row of before.repayments)
    for (const column of Object.keys(row)) {
      const changed = structuredClone(after);
      changed.repayments[0]![column] = 'changed';
      expect(() => assertPreservedOtherCurrencyRows(before, changed, 'JPY')).toThrow();
    }
  for (const key of ['expenses', 'shares', 'settlements', 'adjustments'] as const)
    expect(() =>
      assertPreservedOtherCurrencyRows(before, { ...after, [key]: [] }, 'JPY'),
    ).toThrow();
  after.repayments.push({ id: 'foreign', currency_code: 'TWD', amount_minor: '100' });
  expect(() => assertPreservedOtherCurrencyRows(before, after, 'JPY')).toThrow();
});

for (const existingPayment of [false, true]) {
  test(`T076 isolated real-source Then with prior payment ${existingPayment}`, async ({
    world,
  }) => {
    await seedSplittingExpenses(world, [
      { 項目: '午餐', 幣別: 'JPY', 金額: '1000', 付款人: 'Alice', 分攤者: 'Amy' },
      { 項目: '車票', 幣別: 'TWD', 金額: '300', 付款人: 'Alice', 分攤者: 'Amy' },
    ]);
    if (existingPayment)
      await seedSplittingRepayments(world, [
        { 付款人: 'Amy', 收款人: 'Alice', 幣別: 'JPY', 金額: '400', 日期: '2027-01-19' },
      ]);
    await recordIndependentRepayment(world, existingPayment ? '600' : '400');
    await runIsolatedStep(
      {
        phrase: preservedOtherCurrencySourcesPhrase,
        input: undefined,
        execute: assertPreservedOtherCurrencySources,
      },
      world,
    );
  });
}
