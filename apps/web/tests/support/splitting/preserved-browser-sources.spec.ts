import { test, expect } from '../fixtures.js';
import { historicalRepaymentProjection } from '../../../../api/tests/support/splitting/preserved-settlement-history.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { seedBrowserSplittingExpenses, type BrowserSplittingSnapshot } from './fixture.js';
import { openDirectSettlementScreen } from './direct-settlement-screen.js';
import { toggleSimplification } from './toggle-simplification.js';
import { seedBrowserIndependentRepayment } from './independent-repayment-fixture.js';
import {
  assertBrowserSourcesRemainUnchanged,
  assertPreservedBrowserSources,
  preservedBrowserSourcesPhrase,
} from './preserved-browser-sources.js';

function facts(): BrowserSplittingSnapshot {
  const repayment = {
    id: 'prior-payment',
    trip_id: 'trip',
    payer_member_id: 'amy',
    payee_member_id: 'alice',
    currency_code: 'JPY',
    amount_minor: '400',
    minor_unit: 0,
    paid_on: '2027-03-12',
    kind: 'independent',
    settlement_id: null,
    created_at: '2027-03-12T00:00:00.000Z',
  };

  return {
    sources: {
      trips: [],
      members: [],
      expenses: [{ id: 'expense', amount_minor: '1000' }],
      shares: [{ expense_id: 'expense', member_id: 'amy' }],
      repayments: [repayment],
      settlements: [],
      adjustments: [],
    },
    expenses: {
      items: [
        {
          id: 'expense',
          tripId: 'trip',
          item: '代付',
          amount: '1000',
          currencyCode: 'JPY',
          minorUnit: 0,
          spentOn: '2027-03-11',
          category: null,
          payerMemberId: 'alice',
          shares: [
            { memberId: 'amy', amount: { numerator: '1000', denominator: '1', minorUnit: 0 } },
          ],
        },
      ],
      totalCount: 1,
      nextCursor: null,
    },
    settlement: { accountingRevision: '1', simplifyDebts: false, balances: [], arrangements: [] },
    repayments: { items: [historicalRepaymentProjection(repayment)] },
    totals: { totals: [{ currencyCode: 'JPY', amount: '1000', minorUnit: 0 }] },
  };
}

test('T109: preserved facts reject original shares, timestamps, payments and unauthorized additions', () => {
  const before = facts();
  const after = structuredClone(before);
  after.settlement.accountingRevision = '2';
  after.settlement.simplifyDebts = true;
  expect(() => assertPreservedBrowserSources(before, after)).not.toThrow();
  for (const mutate of [
    (value: BrowserSplittingSnapshot) => {
      value.expenses.items[0]!.shares[0]!.amount = {
        numerator: '999',
        denominator: '1',
        minorUnit: 0,
      };
    },
    (value: BrowserSplittingSnapshot) => {
      value.expenses.items[0]!.spentOn = '2027-03-12';
    },
    (value: BrowserSplittingSnapshot) => {
      value.repayments.items[0]!.createdAt = '2027-03-13T00:00:00Z';
    },
    (value: BrowserSplittingSnapshot) => {
      value.repayments.items[0]!.amount = '401';
    },
    (value: BrowserSplittingSnapshot) => {
      value.repayments.items.push({ ...value.repayments.items[0], id: 'unexpected' });
    },
  ]) {
    const changed = structuredClone(after);
    mutate(changed);
    expect(() => assertPreservedBrowserSources(before, changed)).toThrow();
  }
});

test('T109: only the explicit new command may extend prior actual payments', () => {
  const before = facts();
  const after = structuredClone(before);
  const request = {
    id: 'new-payment',
    payerMemberId: 'amy',
    payeeMemberId: 'alice',
    amount: '700',
    currencyCode: 'JPY' as const,
    paidOn: '2027-03-12',
  };
  const added = { ...before.sources.repayments[0]!, id: request.id, amount_minor: '700' };
  after.sources = { ...after.sources, repayments: [...after.sources.repayments, added] };
  after.repayments.items.push(historicalRepaymentProjection(added));
  expect(() => assertPreservedBrowserSources(before, after, request)).not.toThrow();
  expect(() => assertPreservedBrowserSources(before, after)).toThrow();
  const altered = structuredClone(after);
  altered.repayments.items[0]!.amount = '399';
  expect(() => assertPreservedBrowserSources(before, altered, request)).toThrow();
  expect(() =>
    assertPreservedBrowserSources(before, after, { ...request, amount: '701' }),
  ).toThrow();
});

test('T109: real mode switch preserves expenses and the prior JPY400 repayment', async ({
  page,
  world,
}) => {
  await seedBrowserSplittingExpenses(page, world, [
    { 項目: '代付', 幣別: 'JPY', 金額: '1000', 付款人: 'Alice', 分攤者: 'Amy' },
    { 項目: '台幣代付', 幣別: 'TWD', 金額: '300', 付款人: 'Alice', 分攤者: 'Amy' },
  ]);
  await seedBrowserIndependentRepayment(world, '400');
  await openDirectSettlementScreen(page, world);
  await toggleSimplification(page, world, true);
  await runIsolatedStep(
    {
      phrase: preservedBrowserSourcesPhrase,
      input: undefined,
      execute: (context) => assertBrowserSourcesRemainUnchanged(context),
    },
    world,
  );
});
