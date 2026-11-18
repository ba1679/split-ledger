import { randomUUID } from 'node:crypto';
import { test, expect } from '../fixtures.js';
import { callApi, seedIdentity } from '../seed.js';

test('a reserved trip UUID returns ID_CONFLICT and cannot replace its original owner member', async ({
  world,
}) => {
  await seedIdentity(world, 'Alice');
  const id = randomUUID(),
    input = { id, name: 'UUID保留旅行' };
  const first = await callApi(world, 'POST', '/api/trips', input, 'Alice');
  expect(first.status()).toBe(201);
  const beforeTrip = (await world.db.query('SELECT * FROM trips WHERE id=$1', [id])).rows;
  const beforeMembers = (
    await world.db.query('SELECT * FROM trip_members WHERE trip_id=$1 ORDER BY id', [id])
  ).rows;
  const beforeReservation = (
    await world.db.query('SELECT * FROM trip_id_reservations WHERE trip_id=$1', [id])
  ).rows;
  expect(beforeTrip).toHaveLength(1);
  expect(beforeMembers).toHaveLength(1);
  expect(beforeReservation).toHaveLength(1);
  const duplicate = await callApi(
    world,
    'POST',
    '/api/trips',
    { ...input, name: '不能覆蓋原旅行' },
    'Alice',
  );
  expect(duplicate.status()).toBe(409);
  expect(await duplicate.json()).toMatchObject({ code: 'ID_CONFLICT' });
  expect((await world.db.query('SELECT * FROM trips WHERE id=$1', [id])).rows).toEqual(beforeTrip);
  expect(
    (await world.db.query('SELECT * FROM trip_members WHERE trip_id=$1 ORDER BY id', [id])).rows,
  ).toEqual(beforeMembers);
  expect(
    (await world.db.query('SELECT * FROM trip_id_reservations WHERE trip_id=$1', [id])).rows,
  ).toEqual(beforeReservation);
});

test('a failure after owner member INSERT rolls back the trip and its reservation together', async ({
  world,
}) => {
  await seedIdentity(world, 'Alice');
  const id = randomUUID();
  await world.db.query(
    `CREATE FUNCTION test_reserved_creation_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.trip_id='${id}'::uuid THEN RAISE EXCEPTION 'isolated creation storage failure' USING ERRCODE='XX000'; END IF; RETURN NEW; END; $$`,
  );
  await world.db.query(
    'CREATE TRIGGER test_reserved_creation_failure AFTER INSERT ON trip_members FOR EACH ROW EXECUTE FUNCTION test_reserved_creation_failure()',
  );
  try {
    const response = await callApi(
      world,
      'POST',
      '/api/trips',
      { id, name: '原子建立回滾' },
      'Alice',
    );
    expect(response.status()).toBe(500);
    expect(await response.json()).toMatchObject({ code: 'INTERNAL_ERROR' });
    for (const [table, key] of [
      ['trips', 'id'],
      ['trip_members', 'trip_id'],
      ['trip_id_reservations', 'trip_id'],
    ])
      expect((await world.db.query(`SELECT * FROM ${table} WHERE ${key}=$1`, [id])).rows).toEqual(
        [],
      );
  } finally {
    await world.db.query('DROP TRIGGER test_reserved_creation_failure ON trip_members');
    await world.db.query('DROP FUNCTION test_reserved_creation_failure()');
  }
});
