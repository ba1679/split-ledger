import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from './harness.js';
import { seedSplittingExpenses } from './expense-fixture.js';
import { replaceDinnerSharing } from './replace-dinner-sharing-command.js';
import {
  assertReplacedDinnerRows,
  assertReplacedDinnerView,
  assertReplacedDinnerShares,
  replacedDinnerSharesPhrase,
} from './replaced-dinner-shares.js';
import type { SourceSnapshot } from './types.js';

test('T067 exact parameter-free share assertions reject owner remnants, rounding and collateral changes', () => {
  expect(replacedDinnerSharesPhrase).toBe('晚餐的新份額為 Amy 與 Bob 各 JPY 100');
  expect(replacedDinnerSharesPhrase).not.toMatch(/[{}]/);
  const old = {
    id: 'e',
    item: '晚餐',
    currency_code: 'JPY',
    minor_unit: 0,
    amount_minor: '300',
    payer_member_id: 'Alice',
    updated_at: 'old',
  };
  const before: SourceSnapshot = {
    trips: [],
    members: [],
    expenses: [old],
    shares: [{ expense_id: 'e', member_id: 'Alice' }],
    repayments: [],
    settlements: [],
    adjustments: [],
  };
  const after: SourceSnapshot = {
    ...before,
    expenses: [{ ...old, amount_minor: '200', payer_member_id: 'Amy', updated_at: 'new' }],
    shares: ['Amy', 'Bob'].map((member_id) => ({ expense_id: 'e', member_id })),
  };
  expect(() => assertReplacedDinnerRows(before, after, 'e', 'Amy', 'Bob')).not.toThrow();
  expect(() =>
    assertReplacedDinnerRows(
      before,
      { ...after, shares: [...after.shares, ...before.shares] },
      'e',
      'Amy',
      'Bob',
    ),
  ).toThrow();
  expect(() =>
    assertReplacedDinnerRows(
      before,
      { ...after, expenses: [{ ...after.expenses[0], item: 'overwritten' }] },
      'e',
      'Amy',
      'Bob',
    ),
  ).toThrow();
  const view = {
    id: 'e',
    payerMemberId: 'Amy',
    amount: '200',
    currencyCode: 'JPY',
    minorUnit: 0,
    shares: ['Bob', 'Amy'].map((memberId) => ({
      memberId,
      amount: { numerator: '100', denominator: '1', minorUnit: 0 },
    })),
  };
  expect(() => assertReplacedDinnerView(view, 'e', 'Amy', 'Bob', 0)).not.toThrow();
  expect(() =>
    assertReplacedDinnerView(
      {
        ...view,
        shares: [
          { memberId: 'Amy', amount: { numerator: '99', denominator: '1', minorUnit: 0 } },
          view.shares[0],
        ],
      },
      'e',
      'Amy',
      'Bob',
      0,
    ),
  ).toThrow();
  expect(() =>
    assertReplacedDinnerView(
      { ...view, shares: [...view.shares, { ...view.shares[0], memberId: 'Alice' }] },
      'e',
      'Amy',
      'Bob',
      0,
    ),
  ).toThrow();
});

test('T067 isolated replaced dinner share Then', async ({ world }) => {
  await seedSplittingExpenses(world, [
    { 項目: '晚餐', 幣別: 'JPY', 金額: '300', 付款人: 'Alice', 分攤者: 'Alice、Amy、Bob' },
  ]);
  await replaceDinnerSharing(world);
  await runIsolatedStep(
    { phrase: replacedDinnerSharesPhrase, input: undefined, execute: assertReplacedDinnerShares },
    world,
  );
});
