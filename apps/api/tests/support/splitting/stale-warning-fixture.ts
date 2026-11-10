import { randomUUID } from 'node:crypto';
import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import { independentSplittingOracle, snapshotSplittingSources } from './expense-fixture.js';
import { splittingMemberId, splittingTripId } from './members-fixture.js';
import type { OverpaymentFixtureConfirmation } from './overpayment-warning-fixture.js';
import type { SourceSnapshot } from './types.js';

/** A separate committed write invalidates the saved warning without confirming it. */
export async function seedStaleOverpaymentWarning(world: LedgerWorld): Promise<void> {
  const confirmation = structuredClone(
    world.get<OverpaymentFixtureConfirmation>('splitting:overpaymentConfirmation'),
  );
  const warningSnapshot = world.get<SourceSnapshot>('splitting:warningSnapshot');
  const tripId = splittingTripId(world);
  const before = await snapshotSplittingSources(world, tripId);
  expect(before).toEqual(warningSnapshot);
  const id = randomUUID();
  const aliceId = splittingMemberId(world, 'Alice');
  const response = await world.api.post(`/api/trips/${tripId}/expenses`, {
    headers: { Cookie: world.users.get('甲')!.cookie, Origin: world.get<string>('webOrigin') },
    data: {
      id,
      item: '警告後個人支出',
      amount: '10',
      currencyCode: 'JPY',
      spentOn: '2027-01-20',
      payerMemberId: aliceId,
      shareMemberIds: [aliceId],
    },
  });
  expect(response.status(), 'Product expense transaction must commit the newer revision').toBe(201);
  expect(await response.json()).toMatchObject({ id, payerMemberId: aliceId, amount: '10' });
  const after = await snapshotSplittingSources(world, tripId);
  expect(BigInt(String(after.trips[0]!.accounting_revision))).toBe(
    BigInt(confirmation.accountingRevision) + 1n,
  );
  expect(after.expenses.filter((row) => row.id !== id)).toEqual(before.expenses);
  expect(after.expenses.filter((row) => row.id === id)).toEqual([
    expect.objectContaining({
      id,
      payer_member_id: aliceId,
      amount_minor: '10',
      currency_code: 'JPY',
      minor_unit: 0,
    }),
  ]);
  expect(after.shares.filter((row) => row.expense_id !== id)).toEqual(before.shares);
  expect(after.shares.filter((row) => row.expense_id === id)).toEqual([
    expect.objectContaining({ expense_id: id, member_id: aliceId }),
  ]);
  for (const key of ['members', 'repayments', 'settlements', 'adjustments'] as const)
    expect(after[key]).toEqual(before[key]);
  expect(
    independentSplittingOracle.equal(
      independentSplittingOracle.balance(after, splittingMemberId(world, 'Amy'), 'JPY'),
      { numerator: '-600', denominator: '1', minorUnit: 0 },
    ),
  ).toBe(true);
  expect(world.get('splitting:overpaymentConfirmation')).toEqual(confirmation);
  expect(world.get('splitting:warningSnapshot')).toEqual(warningSnapshot);
  world.splitting.ids.expenses.set('警告後個人支出', id);
  world.splitting.snapshot = after;
  world.set('splitting:sourceSnapshot', after);
  world.set('splitting:before', after);
  world.set('splitting:revision', String(after.trips[0]!.accounting_revision));
}
