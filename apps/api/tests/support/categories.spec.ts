import { randomUUID } from 'node:crypto';
import { test, expect } from './fixtures.js';
import { seedIdentity, seedTrip, seedCategory, seedExpense } from './seed.js';

test('category names count Unicode code points and fold only ASCII letters', async ({ world }) => {
  const user = await seedIdentity(world);
  const headers = { cookie: user.cookie, origin: world.get<string>('webOrigin') };
  for (const name of ['😀'.repeat(30), 'Ä', 'ä', '\u00a0Food\u3000']) {
    const response = await world.api.post('/api/categories', { headers, data: { id: randomUUID(), name } });
    expect(response.status()).toBe(201); expect((await response.json()).name).toBe(name.trim());
  }
  const duplicate = await world.api.post('/api/categories', { headers, data: { id: randomUUID(), name: 'fOoD' } });
  expect(duplicate.status()).toBe(409); expect(await duplicate.json()).toMatchObject({ code: 'CATEGORY_NAME_CONFLICT' });
  const tooLong = await world.api.post('/api/categories', { headers, data: { id: randomUUID(), name: '😀'.repeat(31) } });
  expect(tooLong.status()).toBe(400);
  expect((await world.db.query('SELECT name FROM categories WHERE owner_id=$1', [user.id])).rows).toHaveLength(4);
});

test('category UUID conflicts hide other owners and DELETE rejects a request body', async ({ world }) => {
  const user = await seedIdentity(world); const other = await seedIdentity(world, '乙');
  const foreign = await seedCategory(world, '私人分類', '乙'); const own = await seedCategory(world, '我的分類');
  const headers = { cookie: user.cookie, origin: world.get<string>('webOrigin') };
  const conflict = await world.api.post('/api/categories', { headers, data: { id: foreign.id, name: '新分類' } });
  expect(conflict.status()).toBe(409); expect(await conflict.json()).toMatchObject({ code: 'ID_CONFLICT' });
  for (const value of [other.id, foreign.id, '私人分類']) expect(JSON.stringify(await conflict.json())).not.toContain(value);
  for (const method of ['PATCH', 'DELETE']) {
    const response = await world.api.fetch(`/api/categories/${foreign.id}`, { method, headers, ...(method === 'PATCH' ? { data: { name: '越權' } } : {}) });
    expect(response.status()).toBe(404); expect(await response.json()).toMatchObject({ code: 'NOT_FOUND' });
  }
  const withBody = await world.api.delete(`/api/categories/${own.id}`, { headers, data: {} });
  expect(withBody.status()).toBe(400);
  expect((await world.db.query('SELECT id FROM categories WHERE owner_id=$1', [user.id])).rows).toEqual([{ id: own.id }]);
  expect((await world.db.query('SELECT name FROM categories WHERE id=$1', [foreign.id])).rows[0].name).toBe('私人分類');
});

test('category deletion waits for a concurrent expense reference and preserves both rows', async ({ world }) => {
  const user = await seedIdentity(world); const trip = await seedTrip(world, '旅行'); const category = await seedCategory(world, '餐飲');
  const client = await world.db.connect(); const expenseId = randomUUID();
  let committed = false;
  let deletion: ReturnType<typeof world.api.delete> | undefined;
  try {
    await client.query('BEGIN');
    await client.query('INSERT INTO expenses(id,owner_id,trip_id,category_id,item,amount_minor,currency_code,minor_unit,spent_on) VALUES($1,$2,$3,$4,$5,100,$6,0,$7)', [expenseId, user.id, trip.id, category.id, '午餐', 'JPY', '2027-03-11']);
    deletion = world.api.delete(`/api/categories/${category.id}`, { headers: { cookie: user.cookie, origin: world.get('webOrigin') } });
    await expect.poll(async () => (await world.db.query("SELECT count(*)::int AS count FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE '%delete from \"categories\"%'")).rows[0].count).toBe(1);
    await client.query('COMMIT'); committed = true;
    const result = await deletion;
    expect(result.status()).toBe(409); expect(await result.json()).toMatchObject({ code: 'CATEGORY_IN_USE' });
    expect((await world.db.query('SELECT id FROM categories WHERE id=$1', [category.id])).rows).toHaveLength(1);
    expect((await world.db.query('SELECT category_id FROM expenses WHERE id=$1', [expenseId])).rows[0].category_id).toBe(category.id);
  } finally {
    try { if (!committed) await client.query('ROLLBACK'); await deletion; } finally { client.release(); }
  }
});

test('clearing classification preserves historical precision and rejects a foreign category', async ({ world }) => {
  const user = await seedIdentity(world); const foreign = await seedCategory(world, '別人的分類', '乙');
  const expense = await seedExpense(world, { item: '歷史金額', amount: '12.3', currencyCode: 'USD', minorUnit: 1, categoryName: '餐飲' });
  const path = `/api/trips/${expense.trip_id}/expenses/${expense.id}`;
  const headers = { cookie: user.cookie, origin: world.get<string>('webOrigin') };
  const before = (await world.db.query('SELECT * FROM expenses WHERE id=$1', [expense.id])).rows[0];
  const rejected = await world.api.patch(path, { headers, data: { categoryId: foreign.id } });
  expect(rejected.status()).toBe(404);
  expect((await world.db.query('SELECT * FROM expenses WHERE id=$1', [expense.id])).rows[0]).toEqual(before);
  const cleared = await world.api.patch(path, { headers, data: { categoryId: null } });
  expect(cleared.status()).toBe(200); expect(await cleared.json()).toMatchObject({ amount: '12.3', currencyCode: 'USD', minorUnit: 1, category: null });
  const after = (await world.db.query('SELECT * FROM expenses WHERE id=$1', [expense.id])).rows[0];
  expect({ ...after, category_id: before.category_id, updated_at: before.updated_at }).toEqual(before);
  expect(after.category_id).toBeNull();
});
