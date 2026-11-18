import { test, expect } from '../fixtures.js';
import { seedExpense, seedTrip } from '../seed.js';
import { installOwnedWriteRejection } from './write-rejection.js';

test('real scoped constraint rejection rolls back update/delete and leaves other trip writable', async ({
  world,
}) => {
  const trip = await seedTrip(world, '拒絕工具旅行');
  const expense = await seedExpense(world, {
    tripName: '拒絕工具旅行',
    item: '午餐',
    amount: '300',
  });
  const other = await seedExpense(world, {
    tripName: '其他工具旅行',
    item: '其他午餐',
    amount: '200',
  });
  const before = (await world.db.query('SELECT * FROM expenses WHERE id=$1', [expense.id])).rows;
  const fault = await installOwnedWriteRejection(world, 'expenses', trip.owner_id, trip.id);
  const client = await world.db.connect();
  try {
    await client.query('UPDATE expenses SET item=$2 WHERE id=$1', [other.id, '其他晚餐']);
    expect(await fault.attempts()).toBe(0);
    for (const [index, sql] of [
      'UPDATE expenses SET amount_minor=amount_minor+1 WHERE id=$1',
      'DELETE FROM expenses WHERE id=$1',
    ].entries()) {
      await client.query('BEGIN');
      await expect(client.query(sql, [expense.id])).rejects.toMatchObject({
        code: '23514',
        message: '006 isolated thumbnail write rejection',
      });
      await client.query('ROLLBACK');
      expect(await fault.attempts()).toBe(index + 1);
      expect(
        (await world.db.query('SELECT * FROM expenses WHERE id=$1', [expense.id])).rows,
      ).toEqual(before);
    }
  } finally {
    try {
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
    await fault.dispose();
    await fault.dispose();
  }
});

test('trip rejection rolls back the trip and preceding dependent deletions', async ({ world }) => {
  const trip = await seedTrip(world, '生命週期拒絕工具');
  const expense = await seedExpense(world, {
    tripName: '生命週期拒絕工具',
    item: '保留午餐',
    amount: '300',
  });
  const other = await seedTrip(world, '其他生命週期工具');
  const tripBefore = (await world.db.query('SELECT * FROM trips WHERE id=$1', [trip.id])).rows;
  const expenseBefore = (await world.db.query('SELECT * FROM expenses WHERE id=$1', [expense.id]))
    .rows;
  const fault = await installOwnedWriteRejection(world, 'trips', trip.owner_id, trip.id);
  const client = await world.db.connect();
  try {
    await client.query('UPDATE trips SET name=$2 WHERE id=$1', [other.id, '其他仍可修改']);
    expect(await fault.attempts()).toBe(0);
    for (const [index, sql] of [
      "UPDATE trips SET name=name || '失敗' WHERE id=$1",
      'DELETE FROM trips WHERE id=$1',
    ].entries()) {
      await client.query('BEGIN');
      if (sql.startsWith('DELETE')) {
        // Preceding business deletes must roll back; owner-member guards remain enabled.
        await client.query('DELETE FROM expense_shares WHERE trip_id=$1', [trip.id]);
        await client.query('DELETE FROM expenses WHERE trip_id=$1', [trip.id]);
      }
      await expect(client.query(sql, [trip.id])).rejects.toMatchObject({ code: '23514' });
      await client.query('ROLLBACK');
      expect(await fault.attempts()).toBe(index + 1);
      expect((await world.db.query('SELECT * FROM trips WHERE id=$1', [trip.id])).rows).toEqual(
        tripBefore,
      );
      expect(
        (await world.db.query('SELECT * FROM expenses WHERE id=$1', [expense.id])).rows,
      ).toEqual(expenseBefore);
    }
  } finally {
    try {
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
    await fault.dispose();
  }
});
