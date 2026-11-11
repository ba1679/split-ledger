import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from './harness.js';
import { seedSplittingExpenses } from './expense-fixture.js';
import { seedSplittingRepayments } from './repayments-fixture.js';
import { readTripRepayments } from './read-repayments-command.js';
import {
  assertRepaymentFactItems,
  assertRepaymentFacts,
  repaymentFactsPhrase,
} from './repayment-facts-result.js';
import { historicalRepaymentProjection } from './preserved-settlement-history.js';

test('T077 parameter-free assertion retains every payment field and date/id ordering', () => {
  expect(repaymentFactsPhrase).toBe('實際還款保留各次付款事實');
  expect(repaymentFactsPhrase).not.toMatch(/[{}]/);
  const rows = ['400', '600'].map((amount, index) => ({
    id: `r${index}`,
    trip_id: 'trip',
    payer_member_id: 'Amy',
    payee_member_id: 'Alice',
    amount_minor: amount,
    currency_code: 'JPY',
    minor_unit: 0,
    paid_on: `2027-01-${19 + index}`,
    kind: 'independent',
    settlement_id: null,
    created_at: '2027-01-20T00:00:00Z',
  }));
  const expected = rows.map(historicalRepaymentProjection).reverse();
  expect(() => assertRepaymentFactItems(expected, rows)).not.toThrow();
  expect(() => assertRepaymentFactItems([...expected].reverse(), rows)).toThrow();
  expect(() => assertRepaymentFactItems([{ ...expected[0], amount: '1000' }], rows)).toThrow();
  for (const key of Object.keys(expected[0]!)) {
    const changed = structuredClone(expected) as Record<string, unknown>[];
    changed[0]![key] = 'altered';
    expect(() => assertRepaymentFactItems(changed, rows)).toThrow();
  }
  const tied = rows.map((row) => ({ ...row, paid_on: '2027-01-20' }));
  expect(() =>
    assertRepaymentFactItems(tied.map(historicalRepaymentProjection).reverse(), tied),
  ).not.toThrow();
  expect(() => assertRepaymentFactItems(tied.map(historicalRepaymentProjection), tied)).toThrow();
});

test('T077 isolated repayment facts Then through real history reads', async ({ world }) => {
  await seedSplittingExpenses(world, [
    { 項目: '午餐', 幣別: 'JPY', 金額: '1000', 付款人: 'Alice', 分攤者: 'Amy' },
    { 項目: '車票', 幣別: 'TWD', 金額: '300', 付款人: 'Alice', 分攤者: 'Amy' },
  ]);
  await seedSplittingRepayments(world, [
    { 付款人: 'Amy', 收款人: 'Alice', 幣別: 'JPY', 金額: '400', 日期: '2027-01-19' },
    { 付款人: 'Amy', 收款人: 'Alice', 幣別: 'JPY', 金額: '600', 日期: '2027-01-20' },
  ]);
  await readTripRepayments(world);
  await runIsolatedStep(
    { phrase: repaymentFactsPhrase, input: undefined, execute: assertRepaymentFacts },
    world,
  );
});
