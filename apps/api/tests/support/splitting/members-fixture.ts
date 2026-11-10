import { randomUUID } from 'node:crypto';
import { expect } from '@playwright/test';
import { seedIdentity } from '../seed.js';
import type { LedgerWorld } from '../world.js';
import { requireProductColumns } from './schema.js';

export const splittingMemberNames = ['Alice', 'Amy', 'Bob', 'Carol'] as const;

export function splittingTripId(world: LedgerWorld): string {
  const id = world.splitting.ids.trips.get('日本旅行');

  if (!id) throw Error('Splitting member fixture must establish 日本旅行');

  return id;
}

export function splittingMemberId(world: Pick<LedgerWorld, 'splitting'>, name: string): string {
  const id = world.splitting.ids.members.get(name === 'owner' ? 'Alice' : name);

  if (!id) throw Error(`Splitting member fixture must establish ${name}`);

  return id;
}

/** Direct isolated-DB arrangement; companions deliberately have no auth identities. */
export async function seedSplittingMembers(world: LedgerWorld): Promise<void> {
  await requireProductColumns(world, 'trips', ['simplify_debts', 'accounting_revision']);
  await requireProductColumns(world, 'trip_members', [
    'id',
    'owner_id',
    'trip_id',
    'role',
    'name',
    'name_key',
    'is_active',
  ]);
  const identity = await seedIdentity(world, '甲');
  const tripId = randomUUID();
  const memberIds = new Map(splittingMemberNames.map((name) => [name, randomUUID()]));
  const client = await world.db.connect();

  try {
    await client.query('BEGIN');
    await client.query('UPDATE auth."user" SET name=$2 WHERE id=$1', [identity.id, 'Alice']);
    await client.query(
      'INSERT INTO trips(id,owner_id,name,start_date,end_date,simplify_debts,accounting_revision) VALUES($1,$2,$3,$4,$4,false,0)',
      [tripId, identity.id, '日本旅行', '2027-01-20'],
    );
    for (const [name, id] of memberIds) {
      await client.query(
        'INSERT INTO trip_members(id,owner_id,trip_id,role,name,is_active,created_at,updated_at) VALUES($1,$2,$3,$4,$5,true,now(),now())',
        [id, identity.id, tripId, name === 'Alice' ? 'owner' : 'companion', name],
      );
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  const trip = await world.db.query(
    'SELECT id,owner_id,name,start_date::text,end_date::text,simplify_debts,accounting_revision::text FROM trips WHERE id=$1',
    [tripId],
  );

  expect(trip.rows).toEqual([
    {
      id: tripId,
      owner_id: identity.id,
      name: '日本旅行',
      start_date: '2027-01-20',
      end_date: '2027-01-20',
      simplify_debts: false,
      accounting_revision: '0',
    },
  ]);
  const members = await world.db.query(
    'SELECT id,owner_id,trip_id,role,name,name_key,is_active FROM trip_members WHERE trip_id=$1 ORDER BY name COLLATE "C"',
    [tripId],
  );

  expect(members.rows).toEqual(
    splittingMemberNames.map((name) => ({
      id: memberIds.get(name),
      owner_id: identity.id,
      trip_id: tripId,
      role: name === 'Alice' ? 'owner' : 'companion',
      name,
      name_key: name.toLowerCase(),
      is_active: true,
    })),
  );
  expect(
    (await world.db.query('SELECT name FROM auth."user" WHERE id=$1', [identity.id])).rows,
  ).toEqual([{ name: 'Alice' }]);
  expect(world.users.size).toBe(1);

  world.users.set('甲', { ...identity, name: 'Alice' });
  world.splitting.ids.trips.set('日本旅行', tripId);
  for (const [name, id] of memberIds) world.splitting.ids.members.set(name, id);
  world.set('splitting:tripId', tripId);
  world.set('splitting:ownerId', identity.id);
  world.set('splitting:initialRevision', '0');
  world.set('splitting:revision', '0');
  world.set('backend:tripId', tripId);
  world.set('seed:trip:甲:日本旅行', trip.rows[0]);
}
