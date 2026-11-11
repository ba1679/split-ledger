import { directExpenseArrangements } from '../../../../api/tests/support/splitting/expense-arrangements-result.js';
import { historicalRepaymentProjection } from '../../../../api/tests/support/splitting/preserved-settlement-history.js';
import { snapshotExactBalances } from '../../../../api/tests/support/splitting/simplification-mode-fixture.js';
import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { seedBrowserSplittingExpenses, type BrowserSplittingSnapshot } from './fixture.js';
import { seedBrowserIndependentRepayment } from './independent-repayment-fixture.js';
import { changeExpenseAmount } from './change-expense-amount.js';
import {
  assertPreservedIndependentRepayment,
  assertPreservedIndependentRepaymentScreen,
  preservedIndependentRepaymentPhrase,
} from './preserved-independent-repayment-result.js';

test('T177: saved payment remains immutable and the refreshed screen uses JPY400 and TWD300', async ({
  page,
  world,
}) => {
  await seedBrowserSplittingExpenses(page, world, [
    { 項目: '代付', 幣別: 'JPY', 金額: '1000', 付款人: 'Alice', 分攤者: 'Amy' },
    { 項目: '台幣代付', 幣別: 'TWD', 金額: '300', 付款人: 'Alice', 分攤者: 'Amy' },
  ]);
  await seedBrowserIndependentRepayment(world, '400');
  await changeExpenseAmount(page, world, '代付', '800');
  await runIsolatedStep(
    {
      phrase: preservedIndependentRepaymentPhrase,
      input: undefined,
      execute: (context) => assertPreservedIndependentRepaymentScreen(page, context),
    },
    world,
  );
});

function snapshot(amount: string): BrowserSplittingSnapshot {
  const payment = {
    id: 'payment',
    trip_id: 'trip',
    payer_member_id: 'amy',
    payee_member_id: 'alice',
    currency_code: 'JPY',
    amount_minor: '400',
    minor_unit: 0,
    paid_on: '2027-03-12',
    created_at: '2027-03-12T00:00:00Z',
    kind: 'independent',
    settlement_id: null,
  };
  const sources = {
    trips: [{ accounting_revision: '2', simplify_debts: false }],
    members: [{ id: 'alice' }, { id: 'amy' }],
    expenses: [
      {
        id: 'advance',
        currency_code: 'JPY',
        payer_member_id: 'alice',
        amount_minor: amount,
        minor_unit: 0,
      },
      {
        id: 'twd',
        currency_code: 'TWD',
        payer_member_id: 'alice',
        amount_minor: '30000',
        minor_unit: 2,
      },
    ],
    shares: [
      { expense_id: 'advance', member_id: 'amy' },
      { expense_id: 'twd', member_id: 'amy' },
    ],
    repayments: [payment],
    settlements: [],
    adjustments: [],
  };
  const expenses = sources.expenses.map((row) => ({
    id: row.id,
    tripId: 'trip',
    item: row.id === 'advance' ? '代付' : '台幣代付',
    currencyCode: row.currency_code,
    amount: row.id === 'advance' ? amount : '300.00',
    minorUnit: row.minor_unit,
    spentOn: '2027-03-11',
    category: null,
    payerMemberId: 'alice',
    shares: [
      {
        memberId: 'amy',
        amount: { numerator: row.amount_minor, denominator: '1', minorUnit: row.minor_unit },
      },
    ],
  }));
  const arrangements = directExpenseArrangements(sources).map((row, i) => ({
    ...row,
    key: String(i),
  }));

  return {
    sources,
    expenses: { items: expenses, totalCount: 2, nextCursor: null },
    repayments: { items: [historicalRepaymentProjection(payment)] },
    totals: { totals: [] },
    settlement: {
      accountingRevision: '2',
      simplifyDebts: false,
      directArrangementCount: 2,
      suggestedArrangementCount: 2,
      arrangements,
      balances: snapshotExactBalances(sources).map(({ amount: netAmount, ...row }) => ({
        ...row,
        netAmount,
      })),
    },
  } as BrowserSplittingSnapshot;
}

test('T177: source oracle rejects stale600, rewritten payment and changed TWD', () => {
  const before = snapshot('1000');
  const after = snapshot('800');
  expect(() => assertPreservedIndependentRepayment(before, after, 'alice', 'amy')).not.toThrow();
  const stale = snapshot('1000');
  expect(() => assertPreservedIndependentRepayment(before, stale, 'alice', 'amy')).toThrow();
  const staleProjection = structuredClone(after);
  staleProjection.settlement.arrangements = staleProjection.settlement.arrangements.map((row) =>
    row.currencyCode === 'JPY' ? { ...row, amount: { ...row.amount, numerator: '600' } } : row,
  );
  expect(() =>
    assertPreservedIndependentRepayment(before, staleProjection, 'alice', 'amy'),
  ).toThrow();
  const rewritten = structuredClone(after);
  rewritten.sources.repayments[0]!.amount_minor = '200';
  expect(() => assertPreservedIndependentRepayment(before, rewritten, 'alice', 'amy')).toThrow();
  const twdChanged = structuredClone(after);
  twdChanged.sources.expenses[1]!.amount_minor = '40000';
  expect(() => assertPreservedIndependentRepayment(before, twdChanged, 'alice', 'amy')).toThrow();
});
