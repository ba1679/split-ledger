import { test, expect } from '../fixtures.js';
import { seedBrowserSplittingExpenses } from './fixture.js';
import { openBrowserSettlementForm } from './settlement-form.js';
import { saveBrowserSettlement } from './save-settlement.js';
import {
  assertBrowserSettlementClosed,
  assertNoRoundingPolicy,
  settlementSummaryAmount,
} from './closed-settlement-result.js';

test('T206: exact summary formatting and forbidden policy keys', () => {
  for (const [numerator, denominator, display] of [
    ['100', '3', 'JPY 33.33'],
    ['200', '3', 'JPY 66.67'],
    ['600', '1', 'JPY 600'],
    ['101', '2', 'JPY 50.5'],
  ])
    expect(
      settlementSummaryAmount({ numerator: numerator!, denominator: denominator!, minorUnit: 0 }),
    ).toBe(display);
  assertNoRoundingPolicy({ repayment: { amount: '33' } });
  for (const key of ['roundingPolicy', 'rounding_mode', 'round_policy'])
    expect(() => assertNoRoundingPolicy({ saved: { [key]: 'nearest' } })).toThrow();
});

for (const [paid, owed, amount, shares] of [
  ['33', '100/3', '100', 'Alice、Amy、Bob'],
  ['34', '100/3', '100', 'Alice、Amy、Bob'],
  ['700', '600', '600', 'Amy'],
])
  test(`T206: real saved JPY ${paid} closes exact ${owed}`, async ({ page, world }) => {
    await seedBrowserSplittingExpenses(page, world, [
      { 項目: '點心', 幣別: 'JPY', 金額: amount!, 付款人: 'Alice', 分攤者: shares! },
    ]);
    await openBrowserSettlementForm(page, world, 'Amy');
    await saveBrowserSettlement(page, world, paid!);
    await assertBrowserSettlementClosed(page, world, 'Amy', paid!, owed!);
  });
