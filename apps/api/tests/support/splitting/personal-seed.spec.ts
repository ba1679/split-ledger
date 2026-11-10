import { test, expect } from '../fixtures.js';
import { seedExpense, seedTrip } from '../seed.js';

test('personal seed retains original fields and follows the installed product schema', async ({
  world,
}) => {
  const trip = await seedTrip(world, '日本旅行', '甲', {
    startDate: '2027-01-20',
    endDate: '2027-01-25',
  });

  expect(await seedTrip(world, '日本旅行')).toEqual(trip);
  const expense = await seedExpense(world, {
    item: '機票',
    amount: '8000',
    currencyCode: 'TWD',
    spentOn: '2027-01-15',
    categoryName: '交通',
  });

  expect(expense).toMatchObject({
    owner_id: world.users.get('甲')!.id,
    trip_id: trip.id,
    item: '機票',
    amount_minor: '800000',
    currency_code: 'TWD',
    minor_unit: 2,
  });
  expect(expense.category_id).not.toBeNull();
  expect(
    (await world.db.query('SELECT spent_on::text FROM expenses WHERE id=$1', [expense.id])).rows,
  ).toEqual([{ spent_on: '2027-01-15' }]);
  const splitting =
    (
      await world.db.query(
        "SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='expenses' AND column_name='payer_member_id'",
      )
    ).rowCount === 1;

  if (splitting) {
    const members = (
      await world.db.query('SELECT id,role,name,is_active FROM trip_members WHERE trip_id=$1', [
        trip.id,
      ])
    ).rows;

    expect(members).toHaveLength(1);
    expect(members[0]).toMatchObject({ role: 'owner', name: '甲', is_active: true });
    expect(
      (await world.db.query('SELECT payer_member_id FROM expenses WHERE id=$1', [expense.id])).rows,
    ).toEqual([{ payer_member_id: members[0].id }]);
    expect(
      (
        await world.db.query(
          'SELECT owner_id,trip_id,expense_id,member_id FROM expense_shares WHERE expense_id=$1',
          [expense.id],
        )
      ).rows,
    ).toEqual([
      {
        owner_id: expense.owner_id,
        trip_id: trip.id,
        expense_id: expense.id,
        member_id: members[0].id,
      },
    ]);
  } else {
    expect(expense).not.toHaveProperty('payer_member_id');
    expect((await world.db.query("SELECT to_regclass('trip_members') AS name")).rows).toEqual([
      { name: null },
    ]);
  }
});
