import { test, expect } from '../fixtures.js';
import type { SourceSnapshot } from '../../../../api/tests/support/splitting/types.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { seedBrowserSplittingExpenses } from './fixture.js';
import { settleBrowserAmyArrangement } from './settled-arrangement-fixture.js';
import { changeExpenseAmount } from './change-expense-amount.js';
import { deleteSharedExpense } from './delete-shared-expense.js';
import {
  assertPreservedSettlementPayment,
  assertUnchangedPaymentHistory,
  preservedSettlementPaymentPhrase,
} from './preserved-settlement-payment.js';

test('T176: immutable comparison rejects changed, missing, appended or reapplied historical facts', () => {
  const before: SourceSnapshot = {
    trips: [],
    members: [],
    expenses: [{ id: 'snack', amount_minor: '100' }],
    shares: [],
    settlements: [
      {
        id: 'settlement',
        obligation_numerator: '100',
        obligation_denominator: '3',
        created_at: 'original',
      },
    ],
    repayments: [{ id: 'repayment', amount_minor: '33', paid_on: '2027-03-11' }],
    adjustments: [
      { id: 'amy', numerator: '1', denominator: '3' },
      { id: 'alice', numerator: '-1', denominator: '3' },
    ],
  };
  // The same Then applies to both source correction paths; it does not invent their net oracle.
  assertUnchangedPaymentHistory(before, {
    ...before,
    expenses: [{ id: 'snack', amount_minor: '200' }],
  });
  assertUnchangedPaymentHistory(before, { ...before, expenses: [], shares: [] });
  for (const patch of [
    { settlements: [{ ...before.settlements[0], obligation_numerator: '200' }] },
    { settlements: [{ ...before.settlements[0], created_at: 'changed' }] },
    { repayments: [{ ...before.repayments[0], amount_minor: '34' }] },
    { repayments: [{ ...before.repayments[0], paid_on: '2027-03-12' }] },
    { repayments: [] },
    { adjustments: [...before.adjustments, ...before.adjustments] },
    { adjustments: [{ ...before.adjustments[0], numerator: '2' }, before.adjustments[1]!] },
  ])
    expect(() => assertUnchangedPaymentHistory(before, { ...before, ...patch })).toThrow();
});

for (const action of ['modify', 'delete'] as const) {
  test(`T176: real product ${action} retains the original settlement, adjustments and visible payment`, async ({
    page,
    world,
  }) => {
    await seedBrowserSplittingExpenses(page, world, [
      { 項目: '點心', 幣別: 'JPY', 金額: '100', 付款人: 'Alice', 分攤者: 'Alice、Amy、Bob' },
    ]);
    await settleBrowserAmyArrangement(world);
    if (action === 'modify') await changeExpenseAmount(page, world, '點心', '200');
    else await deleteSharedExpense(page, world, '點心');
    await runIsolatedStep(
      {
        phrase: preservedSettlementPaymentPhrase,
        input: undefined,
        execute: async (context) => assertPreservedSettlementPayment(page, context),
      },
      world,
    );
  });
}
