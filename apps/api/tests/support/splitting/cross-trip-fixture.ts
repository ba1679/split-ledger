import { expect } from '@playwright/test';
import { LedgerWorld } from '../world.js';
import { seedSplittingExpenses, snapshotSplittingSources } from './expense-fixture.js';
import { splittingTripId } from './members-fixture.js';
import type { SourceSnapshot } from './types.js';
import { seedSplittingAccessSources } from './access-fixture.js';

export interface CrossTripSplittingFixture {
  readonly currentTripId: string;
  readonly otherTripId: string;
  readonly otherWorld: LedgerWorld;
  readonly childIds: {
    readonly member: string;
    readonly expense: string;
    readonly repayment: string;
    readonly settlement: string;
  };
  readonly currentBefore: SourceSnapshot;
  readonly otherBefore: SourceSnapshot;
}

export const crossTripFixtureKey = 'splitting:crossTripFixture';

/** Same session owner, distinct persisted trips and real children; no API Act is replayed. */
export async function seedCrossTripSplittingResources(world: LedgerWorld): Promise<void> {
  await seedSplittingExpenses(world, [
    { 項目: '日本基準', 幣別: 'JPY', 金額: '100', 付款人: 'Alice', 分攤者: 'Amy' },
  ]);
  const owner = world.users.get('甲')!;
  const currentTripId = splittingTripId(world);
  const otherWorld = new LedgerWorld(world.db, world.api, world.origin, `${world.namespace}-other`);

  otherWorld.users.set('甲', owner);
  await seedSplittingAccessSources(otherWorld);
  const otherTripId = splittingTripId(otherWorld);

  expect(otherTripId).not.toBe(currentTripId);
  await world.db.query('UPDATE trips SET name=$2 WHERE id=$1 AND owner_id=$3', [
    otherTripId,
    '台南旅行',
    owner.id,
  ]);
  world.splitting.ids.trips.set('台南旅行', otherTripId);
  const currentBefore = await snapshotSplittingSources(world, currentTripId);
  const otherBefore = await snapshotSplittingSources(otherWorld, otherTripId);

  expect(currentBefore.trips[0]).toMatchObject({
    id: currentTripId,
    owner_id: owner.id,
    name: '日本旅行',
  });
  expect(otherBefore.trips[0]).toMatchObject({
    id: otherTripId,
    owner_id: owner.id,
    name: '台南旅行',
  });
  expect(otherWorld.users.get('甲')).toEqual(owner);
  const member = otherBefore.members.find((row) => row.name === 'Amy');
  const expense = otherBefore.expenses.find((row) => String(row.amount_minor) === '1000');
  const repayment = otherBefore.repayments.find((row) => row.kind === 'independent');
  const settlement = otherBefore.settlements[0];

  expect(member).toBeDefined();
  expect(expense).toBeDefined();
  expect(repayment).toMatchObject({ amount_minor: '400' });
  expect(settlement).toMatchObject({
    obligation_numerator: '600',
    obligation_denominator: '1',
    obligation_minor_unit: 0,
  });
  expect(otherBefore.repayments.filter((row) => row.settlement_id === settlement!.id)).toEqual([
    expect.objectContaining({ amount_minor: '600', kind: 'settlement' }),
  ]);
  expect(
    otherBefore.adjustments.filter((row) => row.settlement_id === settlement!.id),
  ).toHaveLength(2);
  for (const row of otherBefore.adjustments.filter((row) => row.settlement_id === settlement!.id))
    expect(row).toMatchObject({ numerator: '0', denominator: '1', minor_unit: 0 });

  const fixture: CrossTripSplittingFixture = {
    currentTripId,
    otherTripId,
    otherWorld,
    childIds: {
      member: String(member!.id),
      expense: String(expense!.id),
      repayment: String(repayment!.id),
      settlement: String(settlement!.id),
    },
    currentBefore,
    otherBefore,
  };
  for (const id of Object.values(fixture.childIds)) {
    expect(
      [
        ...currentBefore.members,
        ...currentBefore.expenses,
        ...currentBefore.repayments,
        ...currentBefore.settlements,
      ].some((row) => row.id === id),
    ).toBe(false);
  }
  world.set(crossTripFixtureKey, fixture);
  world.set('splitting:sourceSnapshot', currentBefore);
  world.splitting.snapshot = currentBefore;
}
