import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from './harness.js';
import { seedSplittingMembers } from './members-fixture.js';
import { recordLegacyPersonalExpense } from './legacy-expense-command.js';
import { seedMigratedLegacyExpense, type LegacySplittingContext } from './legacy-fixture.js';
import { readMigratedFlightExpense } from './read-migrated-expense-command.js';
import {
  assertPersonalFlightExpense,
  assertPersonalFlightView,
  personalFlightExpensePhrase,
} from './personal-flight-expense-result.js';

test('T068 parameter-free view assertion rejects altered fields, payer and extra shares', () => {
  expect(personalFlightExpensePhrase).toBe('機票保留原始欄位且僅由 owner 付款分攤');
  expect(personalFlightExpensePhrase).not.toMatch(/[{}]/);
  const value = {
    id: 'flight',
    item: '機票',
    amount: '8000.00',
    currencyCode: 'TWD',
    minorUnit: 2,
    spentOn: '2027-01-15',
    category: null,
    payerMemberId: 'owner',
    shares: [
      { memberId: 'owner', amount: { numerator: '800000', denominator: '1', minorUnit: 2 } },
    ],
  };
  expect(() => assertPersonalFlightView(value, 'flight', 'owner')).not.toThrow();
  for (const change of [
    { amount: '8000' },
    { spentOn: '2027-01-16' },
    { payerMemberId: 'Amy' },
    { shares: [...value.shares, { ...value.shares[0], memberId: 'Amy' }] },
    {
      shares: [
        { ...value.shares[0], amount: { numerator: '799999', denominator: '1', minorUnit: 2 } },
      ],
    },
  ])
    expect(() => assertPersonalFlightView({ ...value, ...change }, 'flight', 'owner')).toThrow();
});

test('T068 isolated legacy request result', async ({ world }) => {
  await seedSplittingMembers(world);
  await recordLegacyPersonalExpense(world);
  await runIsolatedStep(
    { phrase: personalFlightExpensePhrase, input: undefined, execute: assertPersonalFlightExpense },
    world,
  );
});

test('T068 isolated migrated result uses its independent database and API', async ({ world }) => {
  try {
    await seedMigratedLegacyExpense(world);
    await readMigratedFlightExpense(world);
    await runIsolatedStep(
      {
        phrase: personalFlightExpensePhrase,
        input: undefined,
        execute: assertPersonalFlightExpense,
      },
      world,
    );
  } finally {
    if (world.state.has('splitting:legacyContext'))
      await world.get<LegacySplittingContext>('splitting:legacyContext').dispose();
  }
});
