import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import { managementSnapshot } from './baseline.js';
import { ownerRead } from './preservation.js';

export async function assertTrashCategoryUsage(
  world: LedgerWorld,
  body: { items: Record<string, unknown>[] },
): Promise<void> {
  const categoryId = world.get<string>('management:categoryId');
  const expenseId = world.get<string>('management:categoryExpenseId');
  const selected = body.items.filter((row) => row.id === categoryId);

  expect(selected).toHaveLength(1);
  expect(selected[0]).toMatchObject({ id: categoryId, name: '餐飲', usageCount: 1 });
  const refs = await world.db.query(
    'SELECT e.id,e.category_id,e.trip_id,t.deleted_at FROM expenses e JOIN trips t ON t.id=e.trip_id AND t.owner_id=e.owner_id WHERE e.category_id=$1 ORDER BY e.id',
    [categoryId],
  );

  expect(refs.rows).toHaveLength(1);
  expect(refs.rows[0]).toMatchObject({
    id: expenseId,
    category_id: categoryId,
    trip_id: world.tripManagement.ids.trips.get('日本旅行'),
  });
  expect(refs.rows[0]!.deleted_at).not.toBeNull();
  const reread = await ownerRead(world, `/api/categories/${categoryId}`);

  expect(reread.status()).toBe(200);
  expect(await reread.json()).toEqual(selected[0]);
  expect(await managementSnapshot(world)).toEqual(world.get('management:before'));
}
