import { test, expect } from '../fixtures.js';
import { historicalRepaymentProjection } from '../../../../api/tests/support/splitting/preserved-settlement-history.js';
import { snapshotExactBalances } from '../../../../api/tests/support/splitting/simplification-mode-fixture.js';
import { directExpenseArrangements } from '../../../../api/tests/support/splitting/expense-arrangements-result.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { seedBrowserSplittingExpenses, type BrowserSplittingSnapshot } from './fixture.js';
import { seedBrowserIndependentRepayment } from './independent-repayment-fixture.js';
import { type RepaymentDraft } from './repayment-draft.js';
import { arrangeBrowserOverpaymentWarning } from './overpayment-warning.js';
import { confirmBrowserOverpayment } from './confirm-overpayment.js';
import {
  assertConfirmedOverpaymentSources,
  assertConfirmedOverpaymentScreen,
  confirmedOverpaymentResultPhrase,
} from './confirmed-overpayment-result.js';

const draft: RepaymentDraft = {
  id: 'second',
  payerMemberId: 'amy',
  payeeMemberId: 'alice',
  currencyCode: 'JPY',
  amount: '700',
  paidOn: '2027-03-12',
};

function snapshot(complete: boolean): BrowserSplittingSnapshot {
  const repayment = (id: string, amount: string) => ({
    id,
    trip_id: 'trip',
    owner_id: 'owner',
    payer_member_id: 'amy',
    payee_member_id: 'alice',
    currency_code: 'JPY',
    amount_minor: amount,
    minor_unit: 0,
    paid_on: '2027-03-12',
    created_at: '2027-03-12T00:00:00Z',
    kind: 'independent',
    settlement_id: null,
  });
  const sources = {
    trips: [
      {
        id: 'trip',
        owner_id: 'owner',
        accounting_revision: complete ? '3' : '2',
        simplify_debts: false,
      },
    ],
    members: [{ id: 'alice' }, { id: 'amy' }],
    expenses: [
      {
        id: 'advance',
        currency_code: 'JPY',
        payer_member_id: 'alice',
        amount_minor: '1000',
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
    repayments: complete
      ? [repayment('first', '400'), repayment('second', '700')]
      : [repayment('first', '400')],
    settlements: [],
    adjustments: [],
  };

  return {
    sources,
    expenses: { items: [], totalCount: 2, nextCursor: null },
    repayments: { items: sources.repayments.map(historicalRepaymentProjection) },
    totals: { totals: [] },
    settlement: {
      accountingRevision: complete ? '3' : '2',
      simplifyDebts: false,
      balances: snapshotExactBalances(sources).map(({ amount: netAmount, ...row }) => ({
        ...row,
        netAmount,
      })),
      arrangements: directExpenseArrangements(sources).map((row, i) => ({
        ...row,
        key: String(i),
      })),
    },
  };
}

test('T198 pure authority rejects merged history, altered first payment, fake adjustments, stale JPY and changed TWD', () => {
  expect(confirmedOverpaymentResultPhrase).toBe(
    '已保存 JPY 700 獨立實付且 Alice 改為應付 Amy JPY 100',
  );
  const before = snapshot(false);
  const after = snapshot(true);
  const saved = after.repayments.items.find((item) => item.id === 'second')!;
  const check = (value: BrowserSplittingSnapshot) =>
    assertConfirmedOverpaymentSources(before, value, draft, saved, 'trip', 'alice', 'amy');
  expect(() => check(after)).not.toThrow();
  const missing = structuredClone(after);
  missing.sources = { ...missing.sources, repayments: missing.sources.repayments.slice(1) };
  expect(() => check(missing)).toThrow();
  const changed = structuredClone(after);
  changed.sources.repayments[0]!.amount_minor = '401';
  expect(() => check(changed)).toThrow();
  const fake = structuredClone(after);
  fake.sources = {
    ...fake.sources,
    adjustments: [
      { id: 'fake', member_id: 'amy', numerator: '1', denominator: '1', minor_unit: 0 },
    ],
  };
  expect(() => check(fake)).toThrow();
  const reversed = structuredClone(after);
  const jpy = reversed.settlement.arrangements.find((row) => row.currencyCode === 'JPY')!;
  [jpy.debtorMemberId, jpy.creditorMemberId] = [jpy.creditorMemberId, jpy.debtorMemberId];
  expect(() => check(reversed)).toThrow();
  const wrongAmount = structuredClone(after);
  wrongAmount.settlement.arrangements.find((row) => row.currencyCode === 'JPY')!.amount = {
    numerator: '99',
    denominator: '1',
    minorUnit: 0,
  };
  expect(() => check(wrongAmount)).toThrow();
  const stale = structuredClone(after);
  stale.settlement.arrangements = before.settlement.arrangements;
  expect(() => check(stale)).toThrow();
  const twd = structuredClone(after);
  twd.sources.expenses[1]!.amount_minor = '40000';
  expect(() => check(twd)).toThrow();
  const badProjection = structuredClone(after);
  badProjection.repayments.items[1]!.paidOn = '2027-03-13';
  expect(() => check(badProjection)).toThrow();
  const missingBalance = structuredClone(after);
  missingBalance.settlement.balances = missingBalance.settlement.balances.filter(
    (row) => row.currencyCode !== 'JPY',
  );
  expect(() => check(missingBalance)).toThrow();
});

test('T198 isolated real product confirms 700 under original UUID and reverses JPY only', async ({
  page,
  world,
}) => {
  await seedBrowserSplittingExpenses(page, world, [
    { 項目: '代付', 幣別: 'JPY', 金額: '1000', 付款人: 'Alice', 分攤者: 'Amy' },
    { 項目: '台幣代付', 幣別: 'TWD', 金額: '300', 付款人: 'Alice', 分攤者: 'Amy' },
  ]);
  await seedBrowserIndependentRepayment(world, '400');
  await arrangeBrowserOverpaymentWarning(page, world);
  await confirmBrowserOverpayment(page, world);
  await runIsolatedStep(
    {
      phrase: confirmedOverpaymentResultPhrase,
      input: undefined,
      execute: (context) => assertConfirmedOverpaymentScreen(page, context),
    },
    world,
  );
});
