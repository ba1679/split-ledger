import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from './harness.js';
import { seedSplittingMembers, splittingMemberId, splittingTripId } from './members-fixture.js';
import { seedExpenseValidationMembers } from './expense-validation-fixture.js';

test('T013: isolated validation Given arranges inactive and same-owner foreign-trip members', async ({
  world,
}) => {
  await seedSplittingMembers(world);
  await runIsolatedStep(
    {
      phrase: '支出驗證用的停用與跨旅行成員已建立',
      input: undefined,
      execute: seedExpenseValidationMembers,
    },
    world,
  );
  const currentTripId = splittingTripId(world);
  const otherTripId = world.splitting.ids.trips.get('台南旅行');
  const result = await world.db.query(
    'SELECT id,trip_id,owner_id,name,is_active FROM trip_members WHERE id=ANY($1::uuid[]) ORDER BY name COLLATE "C"',
    [[splittingMemberId(world, 'Carol'), splittingMemberId(world, 'David')]],
  );
  expect(result.rows).toEqual([
    {
      id: splittingMemberId(world, 'Carol'),
      trip_id: currentTripId,
      owner_id: world.users.get('甲')!.id,
      name: 'Carol',
      is_active: false,
    },
    {
      id: splittingMemberId(world, 'David'),
      trip_id: otherTripId,
      owner_id: world.users.get('甲')!.id,
      name: 'David',
      is_active: true,
    },
  ]);
  expect(otherTripId).not.toBe(currentTripId);
  expect(world.splitting.ids.trips.get('日本旅行')).toBe(currentTripId);
  expect(world.users.size).toBe(1);
  expect(
    (
      await world.db.query('SELECT id FROM expenses WHERE trip_id=ANY($1::uuid[])', [
        [currentTripId, otherTripId],
      ])
    ).rows,
  ).toEqual([]);
});
