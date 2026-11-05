import { randomUUID } from 'node:crypto';
import { test, expect } from './fixtures.js';
import { seedIdentity, seedTrip } from './seed.js';

test('trip UUID collisions do not reveal or mutate another account ledger', async ({ world }) => {
  const other = await seedIdentity(world, '乙'); const user = await seedIdentity(world);
  const original = await seedTrip(world, '私人旅行', '乙', { startDate: '2027-03-10' });
  const before = (await world.db.query('SELECT * FROM trips WHERE id=$1', [original.id])).rows;
  const response = await world.api.post('/api/trips', { headers: { cookie: user.cookie, origin: world.get('webOrigin') }, data: { id: original.id, name: '另一趟旅行' } });
  expect(response.status()).toBe(409); expect(await response.json()).toMatchObject({ code: 'ID_CONFLICT' });
  const error = JSON.stringify(await response.json());
  for (const value of [other.id, original.id, '私人旅行']) expect(error).not.toContain(value);
  expect((await world.db.query('SELECT * FROM trips WHERE id=$1', [original.id])).rows).toEqual(before);
  expect((await world.db.query('SELECT id FROM trips WHERE owner_id=$1', [user.id])).rows).toHaveLength(0);
});

test('trip creation rejects invalid dates, blank names and unknown fields without persistence', async ({ world }) => {
  const user = await seedIdentity(world);
  const headers = { cookie: user.cookie, origin: world.get<string>('webOrigin') };
  for (const data of [
    { name: ' \u00a0\u3000' },
    { name: '反序日期', startDate: '2027-03-15', endDate: '2027-03-10' },
    { name: '不存在日期', startDate: '2027-02-30' },
    { name: '禁止指定擁有者', ownerId: user.id },
    { name: 123 },
  ]) {
    const response = await world.api.post('/api/trips', { headers, data: { id: randomUUID(), ...data } });
    expect(response.status()).toBe(400); expect(await response.json()).toMatchObject({ code: 'VALIDATION_ERROR' });
  }
  expect((await world.db.query('SELECT id FROM trips WHERE owner_id=$1', [user.id])).rows).toHaveLength(0);
});

test('trip creation trims Unicode whitespace and PATCH null clears only the specified date', async ({ world }) => {
  const user = await seedIdentity(world); const id = randomUUID();
  const headers = { cookie: user.cookie, origin: world.get<string>('webOrigin') };
  const created = await world.api.post('/api/trips', { headers, data: { id, name: '\u00a0日本旅行\u3000', startDate: '2027-03-10', endDate: '2027-03-15' } });
  expect(created.status()).toBe(201); expect(await created.json()).toMatchObject({ id, name: '日本旅行', startDate: '2027-03-10', endDate: '2027-03-15' });
  const cleared = await world.api.patch(`/api/trips/${id}`, { headers, data: { startDate: null } });
  expect(cleared.status()).toBe(200); expect(await cleared.json()).toMatchObject({ id, name: '日本旅行', startDate: null, endDate: '2027-03-15' });
  const row = (await world.db.query('SELECT owner_id,name,start_date::text,end_date::text FROM trips WHERE id=$1', [id])).rows[0];
  expect(row).toEqual({ owner_id: user.id, name: '日本旅行', start_date: null, end_date: '2027-03-15' });
  const read = await world.api.get(`/api/trips/${id}`, { headers: { cookie: user.cookie } });
  expect(read.status()).toBe(200); expect(await read.json()).toEqual(await cleared.json());
});
