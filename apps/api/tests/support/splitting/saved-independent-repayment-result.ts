import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import { callApi } from '../seed.js';
import { snapshotSplittingSources } from './expense-fixture.js';
import { splittingMemberId, splittingTripId } from './members-fixture.js';
import type { OverpaymentFixtureRequest } from './overpayment-warning-fixture.js';
import { historicalRepaymentProjection } from './preserved-settlement-history.js';
import { assertRepaymentFactItems } from './repayment-facts-result.js';
import type { SourceSnapshot } from './types.js';

export const savedIndependentRepaymentPhrase = '獨立還款已以 JPY {string} 保存';

export function assertIndependentRepaymentWrite(
  before: SourceSnapshot,
  after: SourceSnapshot,
  request: OverpaymentFixtureRequest,
  amount: string,
  reply: unknown,
) {
  expect(amount).toMatch(/^[1-9]\d*$/);
  expect(request).toMatchObject({ amount, currencyCode: 'JPY', paidOn: '2027-01-20' });
  expect(before.repayments.some((row) => row.id === request.id)).toBe(false);
  expect(after.repayments).toHaveLength(before.repayments.length + 1);
  expect(after.repayments.filter((row) => row.id !== request.id)).toEqual(before.repayments);
  const rows = after.repayments.filter((row) => row.id === request.id);
  expect(rows, 'Exactly one repayment must persist under the reserved UUID').toHaveLength(1);
  const row = rows[0]!;
  expect(row).toMatchObject({
    id: request.id,
    trip_id: before.trips[0]!.id,
    payer_member_id: request.payerMemberId,
    payee_member_id: request.payeeMemberId,
    amount_minor: amount,
    currency_code: 'JPY',
    minor_unit: 0,
    kind: 'independent',
    settlement_id: null,
  });
  const expected = historicalRepaymentProjection(row);
  expect(expected.paidOn).toBe('2027-01-20');
  expect(reply, 'Create response must match all persisted repayment fields').toEqual(expected);
  for (const key of ['members', 'expenses', 'shares', 'settlements', 'adjustments'] as const)
    expect(after[key], `Independent payment must preserve ${key}`).toEqual(before[key]);
  expect(before.trips).toHaveLength(1);
  expect(after.trips).toHaveLength(1);
  expect(String(after.trips[0]!.accounting_revision)).toBe(
    (BigInt(String(before.trips[0]!.accounting_revision)) + 1n).toString(),
  );
  const stableTrip = (trip: Record<string, unknown>) =>
    Object.fromEntries(
      Object.entries(trip).filter(([key]) => !['accounting_revision', 'updated_at'].includes(key)),
    );
  expect(stableTrip(after.trips[0]!)).toEqual(stableTrip(before.trips[0]!));

  return expected;
}

export async function assertSavedIndependentRepayment(
  world: LedgerWorld,
  amount: string,
): Promise<void> {
  expect(world.response!.status(), 'Independent repayment must return a saved resource').toBe(201);
  const request = world.get<OverpaymentFixtureRequest>('splitting:repaymentRequest');
  expect(request.id).toBe(world.splitting.ids.repayments.get('pending'));
  expect(request.payerMemberId).toBe(splittingMemberId(world, 'Amy'));
  expect(request.payeeMemberId).toBe(splittingMemberId(world, 'Alice'));
  const before = world.get<SourceSnapshot>('splitting:before');
  const after = await snapshotSplittingSources(world);
  const expected = assertIndependentRepaymentWrite(
    before,
    after,
    request,
    amount,
    world.get('splitting:reply'),
  );
  const path = `/api/trips/${splittingTripId(world)}/repayments`;
  const list = await callApi(world, 'GET', path);
  expect(list.status()).toBe(200);
  assertRepaymentFactItems((await list.json()).items, after.repayments);
  const detail = await callApi(world, 'GET', `${path}/${request.id}`);
  expect(detail.status()).toBe(200);
  expect(await detail.json()).toEqual(expected);
  expect(
    await snapshotSplittingSources(world),
    'Verification must preserve the saved state',
  ).toEqual(after);
}
