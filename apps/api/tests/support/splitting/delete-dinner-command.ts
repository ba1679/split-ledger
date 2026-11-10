import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import { snapshotSplittingSources } from './expense-fixture.js';
import { splittingTripId } from './members-fixture.js';

export async function deleteSharedDinner(world: LedgerWorld): Promise<void> {
  const tripId = splittingTripId(world);
  const expenseId = world.splitting.ids.expenses.get('晚餐');
  expect(expenseId, 'Dinner fixture must expose its stable expense ID').toBeDefined();
  const before = await snapshotSplittingSources(world, tripId);
  expect(before.expenses.some((expense) => expense.id === expenseId)).toBe(true);
  world.set('splitting:before', before);
  world.set('splitting:expenseId', expenseId);
  world.response = await world.api.delete(`/api/trips/${tripId}/expenses/${expenseId}`, {
    headers: { Cookie: world.users.get('甲')!.cookie, Origin: world.get<string>('webOrigin') },
  });
  const reply = await world.response.text();
  world.set('splitting:reply', reply);
  const after = await snapshotSplittingSources(world, tripId);
  if (world.response.ok()) {
    expect(
      world.response.status(),
      'Product must delete the shared dinner with no response body',
    ).toBe(204);
    expect(reply).toBe('');
    expect(after.expenses).toEqual(before.expenses.filter((expense) => expense.id !== expenseId));
    expect(after.shares).toEqual(before.shares.filter((share) => share.expense_id !== expenseId));
    for (const key of ['members', 'repayments', 'settlements', 'adjustments'] as const)
      expect(after[key]).toEqual(before[key]);
    world.splitting.snapshot = after;
    world.set('splitting:sourceSnapshot', after);
  } else {
    expect(after).toEqual(before);
    expect(world.response.status(), 'Product must support deleting the shared dinner').toBe(204);
  }
}
