import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from './harness.js';
import {
  seedOverpaymentWarning,
  type OverpaymentFixtureConfirmation,
} from './overpayment-warning-fixture.js';
import { seedStaleOverpaymentWarning } from './stale-warning-fixture.js';
import type { SourceSnapshot } from './types.js';

test('T018 isolated Given commits a new revision while preserving the original warning', async ({
  world,
}) => {
  await seedOverpaymentWarning(world);
  const confirmation = structuredClone(
    world.get<OverpaymentFixtureConfirmation>('splitting:overpaymentConfirmation'),
  );
  await runIsolatedStep(
    {
      phrase: '超額警告後旅行已有新的帳務版本',
      input: undefined,
      execute: seedStaleOverpaymentWarning,
    },
    world,
  );
  const before = world.get<SourceSnapshot>('splitting:before');
  expect(BigInt(String(before.trips[0]!.accounting_revision))).toBe(
    BigInt(confirmation.accountingRevision) + 1n,
  );
  expect(world.get('splitting:overpaymentConfirmation')).toEqual(confirmation);
  expect(before.repayments).toEqual([]);
  expect(before.expenses).toHaveLength(2);
});
