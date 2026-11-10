import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import { seedExpenseValidationMembers } from './expense-validation-fixture.js';
import { snapshotSplittingSources } from './expense-fixture.js';
import { splittingMemberId, splittingTripId } from './members-fixture.js';

/** Reuses real invalid member identities while preserving all existing payment facts. */
export async function seedRepaymentValidationMembers(world: LedgerWorld): Promise<void> {
  const tripId = splittingTripId(world);
  const before = await snapshotSplittingSources(world, tripId);
  await seedExpenseValidationMembers(world);
  const after = await snapshotSplittingSources(world, tripId);

  expect(after.trips).toEqual(before.trips);
  expect(after.expenses).toEqual(before.expenses);
  expect(after.shares).toEqual(before.shares);
  expect(after.repayments).toEqual(before.repayments);
  expect(after.settlements).toEqual(before.settlements);
  expect(after.adjustments).toEqual(before.adjustments);
  const carolId = splittingMemberId(world, 'Carol');
  expect(after.members.filter((row) => row.id !== carolId)).toEqual(
    before.members.filter((row) => row.id !== carolId),
  );
  expect(after.members.find((row) => row.id === carolId)?.is_active).toBe(false);
  world.set('splitting:repaymentValidationMembers', {
    carolId,
    davidId: splittingMemberId(world, 'David'),
    tripId,
    otherTripId: world.splitting.ids.trips.get('台南旅行'),
    before,
    after,
  });
  world.splitting.snapshot = after;
}
