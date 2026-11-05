import { randomUUID } from 'node:crypto';
import { test, expect } from './fixtures.js';
import { seedIdentity, seedTrip, seedCategory, seedExpense } from './seed.js';

test('expense API persists exact BIGINT limits and preserves historical precision on PATCH', async ({ world }) => {
  const user = await seedIdentity(world); const trip = await seedTrip(world, '日本旅行');
  const headers = { cookie: user.cookie, origin: world.get<string>('webOrigin') };
  const path = `/api/trips/${trip.id}/expenses`;
  for (const [currencyCode, amount, expected] of [['JPY', '9223372036854775807', '9223372036854775807'], ['USD', '92233720368547758.07', '92233720368547758.07'], ['TWD', '92233720368547758', '92233720368547758.00']]) {
    const response = await world.api.post(path, { headers, data: { id: randomUUID(), item: '精確上限', currencyCode, amount, spentOn: '2027-01-15' } });
    expect(response.status()).toBe(201); expect((await response.json()).amount).toBe(expected);
  }
  for (const [currencyCode, amount] of [['JPY', '9223372036854775808'], ['USD', '92233720368547758.08'], ['TWD', '92233720368547759']]) {
    const response = await world.api.post(path, { headers, data: { id: randomUUID(), item: '超過上限', currencyCode, amount, spentOn: '2027-01-15' } });
    expect(response.status()).toBe(400);
  }
  const historical = await seedExpense(world, { item: '歷史美元', amount: '12.3', currencyCode: 'USD', minorUnit: 1 });
  const precise = await world.api.patch(`${path}/${historical.id}`, { headers, data: { amount: '2.34', currencyCode: 'USD' } });
  expect(precise.status()).toBe(400);
  const untouched = await world.api.get(`${path}/${historical.id}`, { headers });
  expect(await untouched.json()).toMatchObject({ amount: '12.3', minorUnit: 1 });
  const rescaled = await world.api.patch(`${path}/${historical.id}`, { headers, data: { currencyCode: 'TWD' } });
  expect(rescaled.status()).toBe(200); expect(await rescaled.json()).toMatchObject({ amount: '12.30', minorUnit: 2 });
  const explicit = await world.api.patch(`${path}/${historical.id}`, { headers, data: { amount: '12.30' } });
  expect(explicit.status()).toBe(400);
});

test('SQL totals normalize historical scales and exceed the per-expense BIGINT limit', async ({ world }) => {
  const user = await seedIdentity(world); const trip = await seedTrip(world, '日本旅行');
  await seedExpense(world, { item: '歷史美元', amount: '12.3', currencyCode: 'USD', minorUnit: 1 });
  await seedExpense(world, { item: '目前美元', amount: '1.23', currencyCode: 'USD' });
  for (const item of ['上限一', '上限二']) await seedExpense(world, { item, amount: '9223372036854775807' });
  const response = await world.api.get(`/api/trips/${trip.id}/totals`, { headers: { cookie: user.cookie } });
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ totals: [{ currencyCode: 'JPY', minorUnit: 0, amount: '18446744073709551614' }, { currencyCode: 'USD', minorUnit: 2, amount: '13.53' }] });
});

test('expense cursors bind account and trip; foreign references and UUIDs never leak data', async ({ world }) => {
  const user = await seedIdentity(world); const other = await seedIdentity(world, '乙');
  const trip = await seedTrip(world, '日本旅行'); const another = await seedTrip(world, '台南旅行');
  const foreignTrip = await seedTrip(world, '私人旅行', '乙'); const foreignCategory = await seedCategory(world, '私人分類', '乙');
  await world.db.query("INSERT INTO expenses(id,owner_id,trip_id,item,amount_minor,currency_code,minor_unit,spent_on) SELECT gen_random_uuid(),$1,$2,'跨頁支出'||g,100,'JPY',0,'2027-03-11'::date-(g%3) FROM generate_series(1,53) AS g", [user.id, trip.id]);
  const path = `/api/trips/${trip.id}/expenses`; const headers = { cookie: user.cookie, origin: world.get<string>('webOrigin') };
  const first = await world.api.get(path, { headers }); const page = await first.json();
  expect(first.status()).toBe(200); expect(page.items).toHaveLength(50); expect(page.totalCount).toBe(53);
  const second = await world.api.get(`${path}?cursor=${encodeURIComponent(page.nextCursor)}`, { headers }); const last = await second.json();
  expect(second.status()).toBe(200); expect(last.items).toHaveLength(3); expect(last.totalCount).toBe(53); expect(last.nextCursor).toBeNull();
  expect(new Set([...page.items, ...last.items].map(row => row.id)).size).toBe(53);
  for (const [url, cookie] of [[`/api/trips/${another.id}/expenses?cursor=${encodeURIComponent(page.nextCursor)}`, user.cookie], [`${path}?cursor=${encodeURIComponent(page.nextCursor)}`, other.cookie], [`${path}?cursor=${encodeURIComponent(page.nextCursor.replace('.', '.x'))}`, user.cookie]]) {
    expect((await world.api.get(url!, { headers: { cookie: cookie! } })).status()).toBe(400);
  }
  const payload = { id: randomUUID(), item: '受保護資料', amount: '100', currencyCode: 'JPY', spentOn: '2027-03-11' };
  const foreign = await world.api.post(path, { headers, data: { ...payload, categoryId: foreignCategory.id } }); expect(foreign.status()).toBe(404);
  expect((await world.api.post(`/api/trips/${foreignTrip.id}/expenses`, { headers, data: payload })).status()).toBe(404);
  const hidden = await seedExpense(world, { owner: '乙', tripName: '私人旅行', item: '私人支出', amount: '100' });
  const conflict = await world.api.post(path, { headers, data: { ...payload, id: hidden.id } });
  expect(conflict.status()).toBe(409); expect(await conflict.json()).toMatchObject({ code: 'ID_CONFLICT' });
  for (const value of [other.id, foreignTrip.id, foreignCategory.id, hidden.id, '私人支出']) expect(JSON.stringify(await conflict.json())).not.toContain(value);
  const totals = await world.api.get(`/api/trips/${trip.id}/totals`, { headers });
  expect(await totals.json()).toEqual({ totals: [{ currencyCode: 'JPY', minorUnit: 0, amount: '5300' }] });
});

test('concurrent partial expense updates preserve both the new amount and cleared category', async ({ world }) => {
  const user = await seedIdentity(world);
  const expense = await seedExpense(world, { item: '午餐', amount: '100', categoryName: '餐飲' });
  const path = `/api/trips/${expense.trip_id}/expenses/${expense.id}`;
  const headers = { cookie: user.cookie, origin: world.get<string>('webOrigin') };
  const responses = await Promise.all([world.api.patch(path, { headers, data: { amount: '200' } }), world.api.patch(path, { headers, data: { categoryId: null } })]);
  for (const response of responses) expect(response.status()).toBe(200);
  const result = await world.api.get(path, { headers });
  expect(await result.json()).toMatchObject({ id: expense.id, item: '午餐', amount: '200', currencyCode: 'JPY', minorUnit: 0, category: null });
  expect((await world.db.query('SELECT amount_minor::text,category_id FROM expenses WHERE id=$1', [expense.id])).rows[0]).toEqual({ amount_minor: '200', category_id: null });
});
