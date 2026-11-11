import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import { independentSplittingOracle, snapshotSplittingSources } from './expense-fixture.js';
import { splittingMemberId, splittingTripId } from './members-fixture.js';

/** Arrange inactivity directly, preserving every historical reference and accounting fact. */
export async function deactivateSplittingMember(world: LedgerWorld, name: string): Promise<void> {
  const memberId = splittingMemberId(world, name);
  const tripId = splittingTripId(world);
  const before = await snapshotSplittingSources(world, tripId);
  const member = before.members.find((row) => row.id === memberId);
  expect(member, `Existing baseline companion ${name}`).toBeDefined();
  expect(member!.role).toBe('companion');
  expect(member!.is_active).toBe(true);

  const result = await world.db.query(
    'UPDATE trip_members SET is_active=false,updated_at=now() WHERE id=$1 AND trip_id=$2 AND owner_id=$3 AND role=$4 RETURNING id',
    [memberId, tripId, world.get<string>('splitting:ownerId'), 'companion'],
  );
  expect(result.rows).toEqual([{ id: memberId }]);
  const after = await snapshotSplittingSources(world, tripId);
  const actual = after.members.find((row) => row.id === memberId)!;
  expect({ ...actual, is_active: member!.is_active, updated_at: member!.updated_at }).toEqual(
    member,
  );
  expect(actual.is_active).toBe(false);
  expect(after.members.filter((row) => row.id !== memberId)).toEqual(
    before.members.filter((row) => row.id !== memberId),
  );
  expect({ ...after, members: before.members }).toEqual(before);

  const currencies = new Set(
    [...before.expenses, ...before.repayments, ...before.adjustments].map((row) =>
      String(row.currency_code),
    ),
  );
  const balances = before.members.flatMap((row) =>
    [...currencies].map((currencyCode) => {
      const id = String(row.id);
      const previous = independentSplittingOracle.balance(before, id, currencyCode);
      const current = independentSplittingOracle.balance(after, id, currencyCode);
      expect(independentSplittingOracle.equal(previous, current)).toBe(true);

      return { memberId: id, currencyCode, before: previous, after: current };
    }),
  );
  world.set(`splitting:inactiveMember:${name}`, { memberId, before, after, balances });
  world.set('splitting:memberStateBefore', before);
  world.set('splitting:memberStateAfter', after);
  world.splitting.snapshot = after;
}
