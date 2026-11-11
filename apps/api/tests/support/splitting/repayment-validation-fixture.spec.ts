import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from './harness.js';
import { seedSplittingExpenses, snapshotSplittingSources } from './expense-fixture.js';
import { seedSplittingRepayments } from './repayments-fixture.js';
import { splittingMemberId, splittingTripId } from './members-fixture.js';
import { seedRepaymentValidationMembers } from './repayment-validation-fixture.js';

test('T019: isolated member validation Given preserves JPY source and prior repayment', async ({
  world,
}) => {
  await seedSplittingExpenses(world, [
    { 項目: '午餐', 幣別: 'JPY', 金額: '600', 付款人: 'Alice', 分攤者: 'Amy' },
  ]);
  await seedSplittingRepayments(world, [
    { 付款人: 'Amy', 收款人: 'Alice', 幣別: 'JPY', 金額: '100', 日期: '2027-01-19' },
  ]);
  const tripId = splittingTripId(world);
  const before = await snapshotSplittingSources(world, tripId);
  await runIsolatedStep(
    {
      phrase: '還款驗證用的停用與跨旅行成員已建立',
      input: undefined,
      execute: seedRepaymentValidationMembers,
    },
    world,
  );
  const after = await snapshotSplittingSources(world, tripId);
  expect(after.expenses).toEqual(before.expenses);
  expect(after.shares).toEqual(before.shares);
  expect(after.repayments).toEqual(before.repayments);
  expect(after.repayments).toHaveLength(1);
  expect(after.trips).toEqual(before.trips);
  const members = await world.db.query(
    'SELECT id,trip_id,owner_id,is_active FROM trip_members WHERE id=ANY($1::uuid[]) ORDER BY id',
    [[splittingMemberId(world, 'Carol'), splittingMemberId(world, 'David')]],
  );
  expect(members.rows).toEqual(
    [
      {
        id: splittingMemberId(world, 'Carol'),
        trip_id: tripId,
        owner_id: world.get<string>('splitting:ownerId'),
        is_active: false,
      },
      {
        id: splittingMemberId(world, 'David'),
        trip_id: world.splitting.ids.trips.get('台南旅行'),
        owner_id: world.get<string>('splitting:ownerId'),
        is_active: true,
      },
    ].sort((left, right) => left.id.localeCompare(right.id)),
  );
  expect(world.splitting.ids.trips.get('台南旅行')).not.toBe(tripId);
});
