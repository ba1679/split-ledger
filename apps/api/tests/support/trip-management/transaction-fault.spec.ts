import { test, expect } from '../fixtures.js';
import { seedExpense, seedTrip } from '../seed.js';
import { installCommandFault } from './transaction-fault.js';

test('006 scoped fault fires after a real child deletion and the transaction rolls back', async ({
  world,
}) => {
  const trip = await seedTrip(world, '故障工具旅行');
  const expense = await seedExpense(world, {
    tripName: '故障工具旅行',
    item: '故障工具午餐',
    amount: '300',
  });
  const before = (
    await world.db.query('SELECT * FROM expenses WHERE trip_id=$1 ORDER BY id', [trip.id])
  ).rows;
  const shares = (
    await world.db.query('SELECT * FROM expense_shares WHERE trip_id=$1 ORDER BY member_id', [
      trip.id,
    ])
  ).rows;
  const fault = await installCommandFault(world, '永久刪除', trip.id, trip.owner_id);
  const client = await world.db.connect();

  try {
    expect(await fault.reached()).toBe(false);
    await client.query('BEGIN');
    await client.query('DELETE FROM expense_shares WHERE trip_id=$1', [trip.id]);
    await expect(
      client.query('DELETE FROM expenses WHERE id=$1', [expense.id]),
    ).rejects.toMatchObject({
      code: 'P0001',
      message: '006 isolated command fault after actual row write',
    });
    await client.query('ROLLBACK');
    expect(await fault.reached()).toBe(true);
    expect(
      (await world.db.query('SELECT * FROM expenses WHERE trip_id=$1 ORDER BY id', [trip.id])).rows,
    ).toEqual(before);
    expect(
      (
        await world.db.query('SELECT * FROM expense_shares WHERE trip_id=$1 ORDER BY member_id', [
          trip.id,
        ])
      ).rows,
    ).toEqual(shares);
  } finally {
    await client.query('ROLLBACK');
    client.release();
    await fault.dispose();
    await fault.dispose();
  }
});
