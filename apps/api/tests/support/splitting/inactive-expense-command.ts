import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import { snapshotSplittingSources } from './expense-fixture.js';
import { splittingTripId } from './members-fixture.js';

/** Correct the item without resubmitting historical inactive member references. */
export async function renameExpenseWithInactiveShares(world: LedgerWorld): Promise<void> {
  const tripId = splittingTripId(world);
  const expenseId = world.splitting.ids.expenses.get('晚餐');
  expect(expenseId, 'Given must identify the existing expense').toBeDefined();
  const before = await snapshotSplittingSources(world, tripId);
  expect(before.expenses.find((row) => row.id === expenseId)).toBeDefined();
  const request = { item: '車票修正' };
  world.set('splitting:expenseId', expenseId);
  world.set('splitting:before', before);
  world.set('splitting:expenseRequest', request);
  world.response = await world.api.patch(`/api/trips/${tripId}/expenses/${expenseId}`, {
    headers: { Cookie: world.users.get('甲')!.cookie, Origin: world.get<string>('webOrigin') },
    data: request,
  });
  world.set('splitting:reply', await world.response.json());
  const after = await snapshotSplittingSources(world, tripId);
  if (!world.response.ok()) {
    expect(after, 'A rejected metadata correction must preserve every accounting source').toEqual(
      before,
    );
  } else {
    expect(world.response.status()).toBe(200);
    world.splitting.snapshot = after;
    world.set('splitting:sourceSnapshot', after);
  }
}
