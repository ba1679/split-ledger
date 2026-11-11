import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import { snapshotSplittingSources } from './expense-fixture.js';
import { splittingTripId } from './members-fixture.js';

/** Correct the existing source amount without replacing the expense or sharing identities. */
export async function changeOriginalExpenseToEightHundred(world: LedgerWorld): Promise<void> {
  const tripId = splittingTripId(world);
  const before = await snapshotSplittingSources(world, tripId);
  expect(before.expenses, 'Given must identify one original expense').toHaveLength(1);
  const original = before.expenses[0]!;
  expect(original.currency_code).toBe('JPY');
  const expenseId = String(original.id);
  const owner = world.users.get('甲');
  expect(owner, 'The amount correction must use the owner session').toBeDefined();
  const request = { amount: '800' };
  world.set('splitting:originalExpenseId', expenseId);
  world.set('splitting:expenseId', expenseId);
  world.set('splitting:expenseRequest', request);
  world.set('splitting:before', before);
  world.response = await world.api.patch(`/api/trips/${tripId}/expenses/${expenseId}`, {
    headers: { Cookie: owner!.cookie, Origin: world.get<string>('webOrigin') },
    data: request,
  });
  const reply: unknown = await world.response.json();
  world.set('splitting:reply', reply);
  const after = await snapshotSplittingSources(world, tripId);
  if (world.response.status() !== 200)
    expect(after, 'A rejected correction must preserve every source').toEqual(before);
  expect(world.response.status(), 'Product must accept the amount correction').toBe(200);
  expect(reply).toMatchObject({ id: expenseId, amount: '800', currencyCode: 'JPY' });
  expect(after.expenses).toHaveLength(1);
  expect(after.expenses[0]).toMatchObject({
    ...original,
    amount_minor: (800n * 10n ** BigInt(Number(original.minor_unit))).toString(),
    updated_at: expect.anything(),
  });
  expect(after.shares, 'An amount correction must retain the original sharing identities').toEqual(
    before.shares,
  );
  world.splitting.snapshot = after;
  world.set('splitting:sourceSnapshot', after);
}
