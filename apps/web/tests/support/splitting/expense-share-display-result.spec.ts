import { test, expect } from '../fixtures.js';
import type { BrowserExpense } from './fixture.js';
import { seedBrowserSplittingExpenses } from './fixture.js';
import { viewExpenseShares } from './view-expense-shares.js';
import {
  assertEqualExpenseShares,
  assertExpenseShareDisplay,
} from './expense-share-display-result.js';

function expense(
  amount: string,
  ids: string[],
  numerator: string,
  denominator: string,
): BrowserExpense {
  return {
    id: 'expense',
    tripId: 'trip',
    item: '點心',
    amount,
    minorUnit: 0,
    currencyCode: 'JPY',
    spentOn: '2027-03-11',
    category: null,
    payerMemberId: 'Alice',
    shares: ids.map((memberId) => ({ memberId, amount: { numerator, denominator, minorUnit: 0 } })),
  };
}

test('T181: exact equal shares retain thirds and exclude a payer outside the collection', () => {
  for (const amount of ['100', '200'])
    assertEqualExpenseShares(expense(amount, ['Alice', 'Amy', 'Bob'], amount, '3'), [
      'Alice',
      'Amy',
      'Bob',
    ]);
  assertEqualExpenseShares(expense('100', ['Amy', 'Bob'], '50', '1'), ['Amy', 'Bob']);
  expect(() =>
    assertEqualExpenseShares(expense('100', ['Alice', 'Amy', 'Bob'], '33', '1'), [
      'Alice',
      'Amy',
      'Bob',
    ]),
  ).toThrow();
  const distributed = expense('100', ['Alice', 'Amy', 'Bob'], '33', '1');
  distributed.shares[0]!.amount = { numerator: '34', denominator: '1', minorUnit: 0 };
  expect(() => assertEqualExpenseShares(distributed, ['Alice', 'Amy', 'Bob'])).toThrow();
  expect(() =>
    assertEqualExpenseShares(expense('100', ['Alice', 'Amy', 'Bob'], '100', '3'), ['Amy', 'Bob']),
  ).toThrow();
});

for (const [amount, members, display] of [
  ['100', 'Alice、Amy、Bob', 'JPY 33.33'],
  ['200', 'Alice、Amy、Bob', 'JPY 66.67'],
  ['100', 'Amy、Bob', 'JPY 50'],
])
  test(`T181: real saved ${amount} shared by ${members} displays ${display}`, async ({
    page,
    world,
  }) => {
    await seedBrowserSplittingExpenses(page, world, [
      { 項目: '點心', 幣別: 'JPY', 金額: amount!, 付款人: 'Alice', 分攤者: members! },
    ]);
    await viewExpenseShares(page, world, '點心');
    await assertExpenseShareDisplay(page, world, display!);
  });
