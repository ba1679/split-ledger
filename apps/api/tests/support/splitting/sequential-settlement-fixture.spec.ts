import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from './harness.js';
import { seedAmySettledBobOutstanding } from './sequential-settlement-fixture.js';
import type { AccessArrangement } from './access-fixture.js';
import type { SourceSnapshot } from './types.js';

test('T020: Amy 33 settlement leaves Bob owing 100/3 with preserved shares', async ({ world }) => {
  await runIsolatedStep(
    {
      phrase: 'Amy 已以 JPY 33 結清點心安排且 Bob 的安排仍未結清',
      input: undefined,
      execute: seedAmySettledBobOutstanding,
    },
    world,
  );
  const snapshot = world.get<SourceSnapshot>('splitting:historySnapshot');
  expect(snapshot.shares).toHaveLength(3);
  expect(snapshot.settlements).toHaveLength(1);
  expect(snapshot.adjustments.map((row) => row.numerator).sort()).toEqual(['-1', '1']);
  expect(world.get<AccessArrangement>('splitting:arrangement').amount).toEqual({
    numerator: '100',
    denominator: '3',
    minorUnit: 0,
  });
  expect(world.get('splitting:newSettlementId')).not.toBe(world.get('splitting:settlementId'));
  expect(world.get('splitting:newRepaymentId')).not.toBe(
    world.get('splitting:settlementRepaymentId'),
  );
});
