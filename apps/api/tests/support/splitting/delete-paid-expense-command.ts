import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import { snapshotSplittingSources } from './expense-fixture.js';
import { splittingTripId } from './members-fixture.js';

/** Delete only the original source, leaving all historical payment facts intact. */
export async function deleteOriginalPaidExpense(world: LedgerWorld): Promise<void> {
  const tripId = splittingTripId(world);
  const before = await snapshotSplittingSources(world, tripId);
  expect(before.expenses, 'Given must identify one original expense').toHaveLength(1);
  expect(
    before.repayments.length,
    'The original expense must already have a payment',
  ).toBeGreaterThan(0);
  const expenseId = String(before.expenses[0]!.id);
  const owner = world.users.get('甲');
  expect(owner, 'The command must use the owner session').toBeDefined();
  world.set('splitting:originalExpenseId', expenseId);
  world.set('splitting:expenseId', expenseId);
  world.set('splitting:before', before);
  world.response = await world.api.delete(`/api/trips/${tripId}/expenses/${expenseId}`, {
    headers: { Cookie: owner!.cookie, Origin: world.get<string>('webOrigin') },
  });
  world.set('splitting:reply', await world.response.text());
  expect(world.response.status(), 'Deleting the existing source must succeed').toBe(204);
  const after = await snapshotSplittingSources(world, tripId);
  expect(after.expenses).toEqual([]);
  expect(after.shares).toEqual([]);
  expect(after.repayments, 'Source deletion must preserve all actual payments').toEqual(
    before.repayments,
  );
  expect(after.settlements, 'Source deletion must preserve historical settlements').toEqual(
    before.settlements,
  );
  expect(after.adjustments, 'Source deletion must preserve historical adjustments').toEqual(
    before.adjustments,
  );
  world.splitting.snapshot = after;
  world.set('splitting:sourceSnapshot', after);
}
