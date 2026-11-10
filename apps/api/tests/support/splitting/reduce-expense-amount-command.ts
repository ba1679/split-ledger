import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import { fixtureMinorAmount, snapshotSplittingSources } from './expense-fixture.js';
import { splittingTripId } from './members-fixture.js';

/** Correct the source amount without replaying or modifying historical payments. */
export async function reduceOriginalExpenseToThreeHundred(world: LedgerWorld): Promise<void> {
  const tripId = splittingTripId(world);
  const before = await snapshotSplittingSources(world, tripId);
  expect(before.expenses, 'Given must identify one original expense').toHaveLength(1);
  const original = before.expenses[0]!;
  expect(original.currency_code, 'The amount-only correction requires a JPY source').toBe('JPY');
  const expenseId = String(original.id);
  const owner = world.users.get('甲');
  expect(owner, 'The amount correction must use the owner session').toBeDefined();
  const request = { amount: '300' };
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
  if (world.response.status() !== 200) {
    expect(after, 'Rejected source corrections must preserve every source').toEqual(before);
  }
  expect(world.response.status(), 'Product must accept the amount-only correction').toBe(200);
  expect(reply).toMatchObject({ id: expenseId, amount: '300', currencyCode: 'JPY' });
  expect(after.expenses.find((row) => row.id === expenseId)).toMatchObject({
    ...original,
    amount_minor: fixtureMinorAmount('300', Number(original.minor_unit)).toString(),
    updated_at: expect.anything(),
  });
  expect(after.shares, 'Amount corrections must retain the sharing identities').toEqual(
    before.shares,
  );
  for (const key of ['members', 'repayments', 'settlements', 'adjustments'] as const) {
    expect(after[key], `Amount correction must preserve ${key}`).toEqual(before[key]);
  }
  world.splitting.snapshot = after;
  world.set('splitting:sourceSnapshot', after);
}
