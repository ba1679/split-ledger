import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from './harness.js';
import { seedPaymentHistorySources } from './history-reconstruction-fixture.js';
import { splittingMemberId } from './members-fixture.js';
import type { SourceSnapshot, SplittingOracle } from './types.js';

test('T023: mixed payment history retains exact JPY fractions and separate TWD source', async ({
  world,
}) => {
  await runIsolatedStep(
    {
      phrase: '旅行有既有實付與結清調整的分帳來源',
      input: undefined,
      execute: seedPaymentHistorySources,
    },
    world,
  );
  const snapshot = world.get<SourceSnapshot>('splitting:historySnapshot');
  const oracle = world.get<SplittingOracle>('splitting:oracle');
  expect(snapshot.expenses).toHaveLength(2);
  expect(snapshot.repayments).toHaveLength(2);
  expect(snapshot.settlements).toHaveLength(1);
  expect(snapshot.adjustments).toHaveLength(2);
  expect(snapshot.trips[0]!.simplify_debts).toBe(false);
  expect(oracle.balance(snapshot, splittingMemberId(world, 'Bob'), 'JPY')).toEqual({
    numerator: '-70',
    denominator: '3',
    minorUnit: 0,
  });
  expect(
    oracle.equal(oracle.balance(snapshot, splittingMemberId(world, 'Bob'), 'TWD'), {
      numerator: '-300',
      denominator: '1',
      minorUnit: 0,
    }),
  ).toBe(true);
});
