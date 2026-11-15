import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import { seedCategory, seedExpense, seedIdentity, seedTrip } from '../seed.js';
import { requireProductColumns } from '../splitting/schema.js';
import { managementSnapshot } from './baseline.js';

export async function arrangeTrashCategory(world: LedgerWorld): Promise<void> {
  await requireProductColumns(world, 'trips', [
    'deleted_at',
    'lifecycle_revision',
    'thumbnail_revision',
  ]);
  const alice = await seedIdentity(world, 'Alice');
  const trip = await seedTrip(world, '日本旅行', 'Alice');
  const category = await seedCategory(world, '餐飲', 'Alice');
  const expense = await seedExpense(world, {
    owner: 'Alice',
    tripName: '日本旅行',
    item: '午餐',
    amount: '1000',
    currencyCode: 'JPY',
    categoryName: '餐飲',
  });

  world.tripManagement.ids.trips.set('日本旅行', trip.id);
  await world.db.query(
    'UPDATE trips SET deleted_at=now(), lifecycle_revision=lifecycle_revision+1 WHERE id=$1 AND owner_id=$2',
    [trip.id, alice.id],
  );
  const refs = await world.db.query(
    'SELECT id,trip_id FROM expenses WHERE category_id=$1 ORDER BY id',
    [category.id],
  );

  expect(refs.rows).toEqual([{ id: expense.id, trip_id: trip.id }]);
  const before = await managementSnapshot(world);

  expect(before.trips[0]!.deleted_at).not.toBeNull();
  expect(before.expenses).toHaveLength(1);
  expect(before.expenses[0]!.category_id).toBe(category.id);
  world.set('management:categoryId', category.id);
  world.set('management:categoryExpenseId', expense.id);
  world.set('management:before', before);
}
