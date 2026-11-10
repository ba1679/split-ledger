import { randomUUID } from 'node:crypto';
import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import { snapshotSplittingSources } from './expense-fixture.js';
import { splittingMemberId, splittingTripId } from './members-fixture.js';

/** Submit the original request shape; only the product supplies splitting defaults. */
export async function recordLegacyPersonalExpense(world: LedgerWorld): Promise<void> {
  const tripId = splittingTripId(world);
  const before = await snapshotSplittingSources(world, tripId);
  const id = randomUUID();
  const request = {
    id,
    item: '機票',
    amount: '8000',
    currencyCode: 'TWD',
    spentOn: '2027-01-15',
    categoryId: null,
  };
  world.splitting.ids.expenses.set('機票', id);
  world.set('splitting:expenseId', id);
  world.set('splitting:expenseRequest', request);
  world.set('splitting:before', before);
  world.response = await world.api.post(`/api/trips/${tripId}/expenses`, {
    headers: { Cookie: world.users.get('甲')!.cookie, Origin: world.get<string>('webOrigin') },
    data: request,
  });
  expect(world.response.status(), 'Product must accept the legacy personal expense request').toBe(
    201,
  );
  const reply: unknown = await world.response.json();
  world.set('splitting:reply', reply);
  expect(reply).toMatchObject({ id });
  const after = await snapshotSplittingSources(world, tripId);
  expect(
    (await world.db.query('SELECT spent_on::text FROM expenses WHERE id=$1', [id])).rows,
  ).toEqual([{ spent_on: '2027-01-15' }]);
  expect(after.expenses.filter((row) => row.id === id)).toEqual([
    expect.objectContaining({
      id,
      item: '機票',
      amount_minor: '800000',
      currency_code: 'TWD',
      minor_unit: 2,
      category_id: null,
      payer_member_id: splittingMemberId(world, 'Alice'),
    }),
  ]);
  expect(after.shares.filter((row) => row.expense_id === id)).toEqual([
    expect.objectContaining({ expense_id: id, member_id: splittingMemberId(world, 'Alice') }),
  ]);
  expect(after.expenses.filter((row) => row.id !== id)).toEqual(before.expenses);
  expect(after.shares.filter((row) => row.expense_id !== id)).toEqual(before.shares);
  for (const key of ['members', 'repayments', 'settlements', 'adjustments'] as const)
    expect(after[key]).toEqual(before[key]);
  world.splitting.snapshot = after;
  world.set('splitting:sourceSnapshot', after);
}
