import { randomUUID } from 'node:crypto';
import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import { splittingTripId } from './members-fixture.js';
import { requireProductColumns } from './schema.js';

/** Arranges a companion in a different trip belonging to the same owner. */
export async function seedOtherTripMember(world: LedgerWorld, name: string): Promise<void> {
  await requireProductColumns(world, 'trip_members', [
    'id',
    'owner_id',
    'trip_id',
    'role',
    'name',
    'name_key',
    'is_active',
  ]);
  const currentTripId = splittingTripId(world);
  const owner = world.users.get('甲');

  if (!owner) throw Error('The current splitting trip must have an owner identity');

  const before = await world.db.query('SELECT * FROM trip_members WHERE trip_id=$1 ORDER BY id', [
    currentTripId,
  ]);
  const tripId = randomUUID();
  const ownerMemberId = randomUUID();
  const memberId = randomUUID();
  const client = await world.db.connect();

  try {
    await client.query('BEGIN');
    await client.query(
      'INSERT INTO trips(id,owner_id,name,simplify_debts,accounting_revision) VALUES($1,$2,$3,false,0)',
      [tripId, owner.id, '台南旅行'],
    );
    await client.query(
      'INSERT INTO trip_members(id,owner_id,trip_id,role,name,is_active) VALUES($1,$2,$3,$4,$5,true),($6,$2,$3,$7,$8,true)',
      [ownerMemberId, owner.id, tripId, 'owner', 'Alice', memberId, 'companion', name],
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  expect(tripId).not.toBe(currentTripId);
  expect(
    (
      await world.db.query('SELECT * FROM trip_members WHERE trip_id=$1 ORDER BY id', [
        currentTripId,
      ])
    ).rows,
  ).toEqual(before.rows);
  expect(
    (
      await world.db.query(
        'SELECT id,owner_id,trip_id,role,name,is_active FROM trip_members WHERE id=$1',
        [memberId],
      )
    ).rows,
  ).toEqual([
    {
      id: memberId,
      owner_id: owner.id,
      trip_id: tripId,
      role: 'companion',
      name,
      is_active: true,
    },
  ]);
  world.splitting.ids.trips.set('台南旅行', tripId);
  world.splitting.ids.members.set(`台南旅行:${name}`, memberId);
  world.set('splitting:otherTripId', tripId);
  world.set('splitting:otherMemberId', memberId);
}
