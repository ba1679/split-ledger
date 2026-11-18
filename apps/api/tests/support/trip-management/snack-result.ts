import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import type { TripManagementSnapshot } from './context.js';
import type { SnackDraft } from './race-fixture.js';
import { independentSplittingOracle } from '../splitting/expense-fixture.js';
import { managementSnapshot, managementTripId, sharedSnapshot } from './baseline.js';
import { assertRejectedCommand } from './rejections.js';
import { ownerRead } from './preservation.js';

export function assertSnackSources(
  before: TripManagementSnapshot,
  after: TripManagementSnapshot,
  draft: SnackDraft,
  ownerId: string,
  tripId: string,
): void {
  const inserted = after.expenses.filter((row) => row.id === draft.id);

  expect(inserted).toHaveLength(1);
  expect(inserted[0]).toMatchObject({
    id: draft.id,
    owner_id: ownerId,
    trip_id: tripId,
    item: '點心',
    amount_minor: '500',
    currency_code: 'JPY',
    minor_unit: 0,
    payer_member_id: draft.payerMemberId,
    category_id: null,
  });
  const spentOn = inserted[0]!.spent_on;
  const storedDate =
    spentOn instanceof Date
      ? `${spentOn.getFullYear()}-${String(spentOn.getMonth() + 1).padStart(2, '0')}-${String(spentOn.getDate()).padStart(2, '0')}`
      : String(spentOn);

  expect(storedDate).toBe(draft.spentOn);
  expect(after.expenses.filter((row) => row.id !== draft.id)).toEqual(before.expenses);
  expect(
    after.shares
      .filter((row) => row.expense_id === draft.id)
      .map((row) => row.member_id)
      .sort(),
  ).toEqual([...draft.shareMemberIds].sort());
  expect(after.shares.filter((row) => row.expense_id !== draft.id)).toEqual(before.shares);
  for (const key of [
    'members',
    'repayments',
    'settlements',
    'adjustments',
    'thumbnails',
    'reservations',
    'categories',
  ] as const)
    expect(after[key], `Snack cannot modify original ${key}`).toEqual(before[key]);
  const expectedSources = {
    ...before,
    expenses: [
      ...before.expenses,
      {
        id: draft.id,
        amount_minor: '500',
        currency_code: 'JPY',
        minor_unit: 0,
        payer_member_id: draft.payerMemberId,
      },
    ],
    shares: [
      ...before.shares,
      ...draft.shareMemberIds.map((member_id) => ({ expense_id: draft.id, member_id })),
    ],
  };
  const currencies = new Set(['JPY', ...before.expenses.map((row) => String(row.currency_code))]);

  for (const currency of currencies)
    for (const member of before.members)
      expect(
        independentSplittingOracle.equal(
          independentSplittingOracle.balance(after, String(member.id), currency),
          independentSplittingOracle.balance(expectedSources, String(member.id), currency),
        ),
      ).toBe(true);
}

export async function assertSnackOutcome(world: LedgerWorld, outcome: string): Promise<void> {
  expect(['成功', '拒絕']).toContain(outcome);
  const before = world.get<TripManagementSnapshot>('management:before');
  const draft = world.get<SnackDraft>('management:snackRequest');
  const after = await managementSnapshot(world);

  if (outcome === '拒絕') {
    await assertRejectedCommand(world, 'TRIP_TRASHED');
    expect(after.expenses.some((row) => row.id === draft.id)).toBe(false);
    expect(after.shares.some((row) => row.expense_id === draft.id)).toBe(false);
  } else {
    expect(world.response!.status()).toBe(201);
    assertSnackSources(before, after, draft, world.users.get('Alice')!.id, managementTripId(world));
    expect(after.receipts).toEqual(before.receipts);
    const row = after.trips[0]!,
      prior = before.trips[0]!;
    const fields = (value: Record<string, unknown>) => {
      const { accounting_revision: _revision, updated_at: _updated, ...rest } = value;

      return rest;
    };

    expect(fields(row)).toEqual(fields(prior));
    expect(String(row.accounting_revision)).toBe(
      String(BigInt(String(prior.accounting_revision)) + 1n),
    );
    const expected = {
      id: draft.id,
      tripId: managementTripId(world),
      item: '點心',
      amount: '500',
      currencyCode: 'JPY',
      payerMemberId: draft.payerMemberId,
      spentOn: draft.spentOn,
      minorUnit: 0,
      category: null,
      shares: [...draft.shareMemberIds].sort().map((memberId) => ({
        memberId,
        amount: { numerator: '250', denominator: '1', minorUnit: 0 },
      })),
    };

    expect(await world.response!.json()).toMatchObject(expected);
    const read = await ownerRead(
      world,
      `/api/trips/${managementTripId(world)}/expenses/${draft.id}`,
    );

    expect(read.status()).toBe(200);
    expect(await read.json()).toMatchObject(expected);
  }
  expect(await managementSnapshot(world)).toEqual(after);
  expect(await sharedSnapshot(world)).toEqual(world.get('management:sharedBefore'));
}
