import { randomUUID } from 'node:crypto';
import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import { seedSession } from '../seed.js';
import { independentSplittingOracle } from '../splitting/expense-fixture.js';
import { managementSnapshot, managementTripId, sharedSnapshot } from './baseline.js';
import { executeOwnerTripCommand, type RecordedTripCommand } from './commands.js';
import { holdTripRow } from './row-lock.js';

export interface SnackDraft {
  id: string;
  item: string;
  amount: string;
  currencyCode: string;
  spentOn: string;
  payerMemberId: string;
  shareMemberIds: string[];
}

export async function arrangeFirstWriter(world: LedgerWorld, operation: string): Promise<void> {
  expect(['保存點心', '移至垃圾桶', '永久刪除']).toContain(operation);
  const original = await managementSnapshot(world);
  const tripId = managementTripId(world);
  const alice = world.splitting.ids.members.get('Alice')!;
  const amy = world.splitting.ids.members.get('Amy')!;
  const draft: SnackDraft = {
    id: randomUUID(),
    item: '點心',
    amount: '500',
    currencyCode: 'JPY',
    spentOn: '2027-03-14',
    payerMemberId: alice,
    shareMemberIds: [alice, amy],
  };
  const alternate = await seedSession(world, 'Alice');

  expect(alternate.cookie).not.toBe(world.users.get('Alice')!.cookie);
  world.set('management:snackDraft', draft);
  world.set('management:raceOriginal', original);
  if (operation === '永久刪除' && original.trips[0]!.deleted_at === null) {
    await executeOwnerTripCommand(world, '移至垃圾桶', alternate.cookie);
    expect(world.response!.status()).toBe(200);
  }
  const barrier = await holdTripRow(world, tripId);
  let pending: Promise<void> = Promise.resolve();
  let failure: unknown;

  try {
    pending = (async () => {
      if (operation === '保存點心') {
        const response = await world.api.post(`/api/trips/${tripId}/expenses`, {
          headers: { cookie: alternate.cookie, origin: world.get('webOrigin') },
          data: draft,
        });

        try {
          expect(response.status()).toBe(201);
        } finally {
          await response.dispose();
        }
      } else {
        await executeOwnerTripCommand(world, operation, alternate.cookie);
        expect(world.response!.status()).toBe(200);
        world.set(
          'management:firstCommand',
          world.get<RecordedTripCommand>('management:lastCommand'),
        );
      }
    })().catch((error) => {
      failure = error;
    });
    await barrier.waitForBlockedWriter();
  } finally {
    await barrier.release();
    await pending;
  }
  if (failure) throw failure;
  const after = await managementSnapshot(world);

  if (operation === '保存點心') {
    const snack = after.expenses.filter((row) => row.id === draft.id);

    expect(snack).toHaveLength(1);
    expect(snack[0]).toMatchObject({
      owner_id: world.users.get('Alice')!.id,
      trip_id: tripId,
      item: '點心',
      amount_minor: '500',
      currency_code: 'JPY',
      minor_unit: 0,
      payer_member_id: alice,
    });
    expect(
      after.shares
        .filter((row) => row.expense_id === draft.id)
        .map((row) => row.member_id)
        .sort(),
    ).toEqual([alice, amy].sort());
    expect(independentSplittingOracle.balance(after, alice, 'JPY')).toEqual({
      numerator: '250',
      denominator: '1',
      minorUnit: 0,
    });
    expect(independentSplittingOracle.balance(after, amy, 'JPY')).toEqual({
      numerator: '-250',
      denominator: '1',
      minorUnit: 0,
    });
    expect(after.trips[0]!.deleted_at).toBeNull();
  } else if (operation === '移至垃圾桶') {
    expect(after.trips[0]!.deleted_at).not.toBeNull();
    expect(String(after.trips[0]!.lifecycle_revision)).toBe(
      String(BigInt(String(original.trips[0]!.lifecycle_revision)) + 1n),
    );
  } else {
    for (const key of [
      'trips',
      'members',
      'expenses',
      'shares',
      'repayments',
      'settlements',
      'adjustments',
      'thumbnails',
    ] as const)
      expect(after[key]).toEqual([]);
    expect(after.reservations[0]!.purged_at).not.toBeNull();
  }
  world.set('management:firstWriter', operation);
  world.set('management:firstCommitted', after);
  world.set('management:before', after);
  world.set('management:sharedBefore', await sharedSnapshot(world));
}
