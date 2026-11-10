import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import type { BrowserSplittingSnapshot } from './fixture.js';
import {
  disposeBrowserMigratedLegacyExpense,
  seedBrowserMigratedLegacyExpense,
} from './legacy-browser-fixture.js';
import { viewExpenseShares } from './view-expense-shares.js';
import {
  assertMigratedFlight,
  assertMigratedFlightProjection,
  migratedFlightResultPhrase,
} from './migrated-flight-result.js';

function flight(): BrowserSplittingSnapshot {
  return {
    sources: {
      trips: [],
      members: [],
      expenses: [],
      shares: [],
      repayments: [],
      settlements: [],
      adjustments: [],
    },
    expenses: {
      items: [
        {
          id: 'flight',
          tripId: 'trip',
          item: '機票',
          amount: '8000.00',
          currencyCode: 'TWD',
          minorUnit: 2,
          spentOn: '2027-01-15',
          category: null,
          payerMemberId: 'alice',
          shares: [
            { memberId: 'alice', amount: { numerator: '800000', denominator: '1', minorUnit: 2 } },
          ],
        },
      ],
      totalCount: 1,
      nextCursor: null,
    },
    totals: { totals: [{ currencyCode: 'TWD', amount: '8000.00', minorUnit: 2 }] },
    repayments: { items: [] },
    settlement: { accountingRevision: '0', simplifyDebts: false, balances: [], arrangements: [] },
  };
}

test('T179: legacy flight rejects changed identity, content, shares, totals or debt', () => {
  const original = flight();
  assertMigratedFlightProjection(flight(), original, 'flight', 'alice');
  for (const mutate of [
    (value: BrowserSplittingSnapshot) => {
      value.expenses.items[0]!.id = 'replacement';
    },
    (value: BrowserSplittingSnapshot) => {
      value.expenses.items[0]!.spentOn = '2027-03-11';
    },
    (value: BrowserSplittingSnapshot) => {
      value.expenses.items[0]!.category = { id: 'category' };
    },
    (value: BrowserSplittingSnapshot) => {
      value.expenses.items[0]!.payerMemberId = 'amy';
    },
    (value: BrowserSplittingSnapshot) => {
      value.expenses.items[0]!.shares[0]!.memberId = 'amy';
    },
    (value: BrowserSplittingSnapshot) => {
      value.totals.totals[0]!.amount = '8001.00';
    },
    (value: BrowserSplittingSnapshot) => {
      value.settlement.arrangements = [{ key: 'unexpected-debt' } as never];
    },
  ]) {
    const changed = flight();
    mutate(changed);
    expect(() => assertMigratedFlightProjection(changed, original, 'flight', 'alice')).toThrow();
  }
  const debt = flight();
  debt.settlement.balances = [
    {
      memberId: 'alice',
      currencyCode: 'TWD',
      netAmount: { numerator: '1', denominator: '1', minorUnit: 2 },
    },
  ];
  expect(() =>
    assertMigratedFlightProjection(debt, structuredClone(debt), 'flight', 'alice'),
  ).toThrow();
  for (const minorUnit of [0, 1, 2, 3, 4]) {
    const zero = flight();
    zero.settlement.balances = [
      {
        memberId: 'alice',
        currencyCode: 'TWD',
        netAmount: { numerator: '0', denominator: '1', minorUnit },
      },
    ];
    assertMigratedFlightProjection(zero, structuredClone(zero), 'flight', 'alice');
    for (const amount of [
      { numerator: '0', denominator: '2', minorUnit },
      { numerator: '0', denominator: '1', minorUnit: -1 },
      { numerator: '0', denominator: '1', minorUnit: 5 },
      { numerator: '0', denominator: '1', minorUnit: 0.5 },
    ]) {
      const invalid = structuredClone(zero);
      invalid.settlement.balances[0]!.netAmount = amount;
      expect(() =>
        assertMigratedFlightProjection(invalid, structuredClone(invalid), 'flight', 'alice'),
      ).toThrow();
    }
  }
});

test('T179: isolated Then checks the original flight against its migrated authority', async ({
  page,
  world,
}) => {
  try {
    await seedBrowserMigratedLegacyExpense(page, world);
    await viewExpenseShares(page, world, '機票');
    await runIsolatedStep(
      {
        phrase: migratedFlightResultPhrase,
        input: undefined,
        execute: async (context) => assertMigratedFlight(page, context),
      },
      world,
    );
  } finally {
    await disposeBrowserMigratedLegacyExpense(page, world);
  }
});
