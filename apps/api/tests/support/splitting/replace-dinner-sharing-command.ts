import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import { fixtureMinorAmount, snapshotSplittingSources } from './expense-fixture.js';
import { splittingMemberId, splittingTripId } from './members-fixture.js';

/** One owner command replaces the amount, payer, and complete sharing set together. */
export async function replaceDinnerSharing(world: LedgerWorld): Promise<void> {
  const tripId = splittingTripId(world);
  const expenseId = world.splitting.ids.expenses.get('晚餐');
  expect(expenseId, 'Given must establish the dinner expense').toBeDefined();
  const before = await snapshotSplittingSources(world, tripId);
  const original = before.expenses.find((row) => row.id === expenseId);
  expect(original, 'Dinner must be persisted in the current trip').toBeDefined();
  expect(original!.currency_code).toBe('JPY');
  const owner = world.users.get('甲');
  expect(owner, 'The correction must use the owner session').toBeDefined();
  const amy = splittingMemberId(world, 'Amy');
  const bob = splittingMemberId(world, 'Bob');
  const request = { amount: '200', payerMemberId: amy, shareMemberIds: [amy, bob] };
  world.set('splitting:expenseId', expenseId);
  world.set('splitting:expenseRequest', request);
  world.set('splitting:before', before);
  world.response = await world.api.patch(`/api/trips/${tripId}/expenses/${expenseId}`, {
    headers: { Cookie: owner!.cookie, Origin: world.get<string>('webOrigin') },
    data: request,
  });
  const reply: unknown = await world.response.json();
  world.set('splitting:reply', reply);
  if (world.response.status() !== 200) {
    expect(
      await snapshotSplittingSources(world, tripId),
      'Rejected corrections preserve sources',
    ).toEqual(before);
  }
  expect(world.response.status(), 'Product must support replacing dinner sharing atomically').toBe(
    200,
  );
  const after = await snapshotSplittingSources(world, tripId);
  expect(reply).toMatchObject({ id: expenseId, amount: '200', payerMemberId: amy });
  expect(after.expenses.find((row) => row.id === expenseId)).toMatchObject({
    ...original,
    amount_minor: fixtureMinorAmount('200', Number(original!.minor_unit)).toString(),
    payer_member_id: amy,
    updated_at: expect.anything(),
  });
  const shares = after.shares.filter((row) => row.expense_id === expenseId);
  expect(shares.map((row) => row.member_id).sort()).toEqual([amy, bob].sort());
  expect(after.shares.filter((row) => row.expense_id !== expenseId)).toEqual(
    before.shares.filter((row) => row.expense_id !== expenseId),
  );
  for (const key of ['members', 'repayments', 'settlements', 'adjustments'] as const)
    expect(after[key], `A source correction must preserve ${key}`).toEqual(before[key]);
  const revision = String(after.trips[0]!.accounting_revision);
  expect(BigInt(revision)).toBe(BigInt(String(before.trips[0]!.accounting_revision)) + 1n);
  world.set('splitting:revision', revision);
  world.splitting.snapshot = after;
  world.set('splitting:sourceSnapshot', after);
}
