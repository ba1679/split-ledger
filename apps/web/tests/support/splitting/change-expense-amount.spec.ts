import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { seedBrowserSplittingExpenses, type BrowserExpense } from './fixture.js';
import { seedBrowserIndependentRepayment } from './independent-repayment-fixture.js';
import {
  assertAmountOnlyPayload,
  changeAdvanceAmountPhrase,
  changeExpenseAmount,
  expenseAmountChangeKey,
  type ExpenseAmountChange,
} from './change-expense-amount.js';

test('T149: amount-only PATCH permits retained form fields but rejects identity and participant changes', () => {
  const expense: BrowserExpense = {
    id: 'existing',
    tripId: 'trip',
    item: '代付',
    amount: '1000',
    currencyCode: 'JPY',
    minorUnit: 0,
    spentOn: '2027-03-11',
    category: null,
    payerMemberId: 'alice',
    shares: [{ memberId: 'amy', amount: { numerator: '1000', denominator: '1', minorUnit: 0 } }],
  };
  assertAmountOnlyPayload({ amount: '800' }, expense, '800');
  assertAmountOnlyPayload(
    { amount: '800', payerMemberId: 'alice', shareMemberIds: ['amy'] },
    expense,
    '800',
  );
  for (const payload of [
    { amount: '700' },
    { amount: '800', id: 'replacement' },
    { amount: '800', payerMemberId: 'amy' },
    { amount: '800', shareMemberIds: ['alice'] },
    { amount: '800', currencyCode: 'TWD' },
    { amount: '800', item: '其他' },
  ])
    expect(() => assertAmountOnlyPayload(payload, expense, '800')).toThrow();
});

test('T149: isolated UI amount correction preserves the original UUID, JPY payment and TWD source', async ({
  page,
  world,
}) => {
  await seedBrowserSplittingExpenses(page, world, [
    { 項目: '代付', 幣別: 'JPY', 金額: '1000', 付款人: 'Alice', 分攤者: 'Amy' },
    { 項目: '台幣代付', 幣別: 'TWD', 金額: '300', 付款人: 'Alice', 分攤者: 'Amy' },
  ]);
  await seedBrowserIndependentRepayment(world, '400');
  await runIsolatedStep(
    {
      phrase: changeAdvanceAmountPhrase,
      input: undefined,
      execute: async (context) => changeExpenseAmount(page, context, '代付', '800'),
    },
    world,
  );
  const state = world.get<ExpenseAmountChange>(expenseAmountChangeKey);
  expect(state.status).toBe(200);
  expect(state.before.sources.repayments).toHaveLength(1);
  expect(state.after.sources.repayments).toEqual(state.before.sources.repayments);
  expect(state.after.sources.expenses).toHaveLength(2);
});
