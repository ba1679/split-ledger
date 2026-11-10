import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import { snapshotSplittingSources } from './expense-fixture.js';
import { splittingTripId } from './members-fixture.js';

/** Change only this source's currency/amount; actual past payments retain their currency. */
export async function changeOriginalExpenseCurrency(world: LedgerWorld): Promise<void> {
  const tripId = splittingTripId(world);
  const before = await snapshotSplittingSources(world, tripId);
  expect(before.expenses, 'Given must identify one original expense').toHaveLength(1);
  const original = before.expenses[0]!;
  const expenseId = String(original.id);
  const owner = world.users.get('甲');
  expect(owner, 'The currency correction must use the owner session').toBeDefined();
  const request = { currencyCode: 'JPY', amount: '200' };
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
    expect(after, 'A rejected correction must preserve all original sources').toEqual(before);
  }
  expect(world.response.status(), 'Product must accept the currency correction').toBe(200);
  const currency = await world.db.query('SELECT minor_unit FROM currencies WHERE code=$1', ['JPY']);
  expect(currency.rows).toHaveLength(1);
  const minorUnit = Number(currency.rows[0]!.minor_unit);
  expect(reply).toMatchObject({ id: expenseId, amount: '200', currencyCode: 'JPY', minorUnit });
  const updated = after.expenses.find((row) => row.id === expenseId);
  expect(updated).toBeDefined();
  expect(updated).toMatchObject({
    ...original,
    currency_code: 'JPY',
    amount_minor: (200n * 10n ** BigInt(minorUnit)).toString(),
    minor_unit: minorUnit,
    updated_at: expect.anything(),
  });
  expect(after.shares, 'Changing currency must retain the original sharing identities').toEqual(
    before.shares,
  );
  for (const key of ['members', 'repayments', 'settlements', 'adjustments'] as const)
    expect(after[key], `Currency correction must preserve ${key}`).toEqual(before[key]);
  world.splitting.snapshot = after;
  world.set('splitting:sourceSnapshot', after);
}
