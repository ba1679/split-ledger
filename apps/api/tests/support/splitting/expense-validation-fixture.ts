import { randomUUID } from 'node:crypto';
import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import { requireProductColumns } from './schema.js';
import { splittingMemberId, splittingTripId } from './members-fixture.js';

/** Invalid input identities are real rows, arranged without exercising an expense command. */
export async function seedExpenseValidationMembers(world: LedgerWorld): Promise<void> {
  await requireProductColumns(world, 'trips', ['simplify_debts', 'accounting_revision']);
  await requireProductColumns(world, 'trip_members', ['owner_id', 'trip_id', 'role', 'is_active']);
  const tripId = splittingTripId(world);
  const carolId = splittingMemberId(world, 'Carol');
  const ownerId = world.get<string>('splitting:ownerId');
  const otherTripId = randomUUID();
  const otherOwnerMemberId = randomUUID();
  const davidId = randomUUID();
  const client = await world.db.connect();

  try {
    await client.query('BEGIN');
    const deactivated = await client.query(
      'UPDATE trip_members SET is_active=false,updated_at=now() WHERE id=$1 AND trip_id=$2 AND owner_id=$3 AND role=$4 RETURNING id',
      [carolId, tripId, ownerId, 'companion'],
    );
    expect(deactivated.rows).toEqual([{ id: carolId }]);
    await client.query(
      'INSERT INTO trips(id,owner_id,name,start_date,end_date,simplify_debts,accounting_revision) VALUES($1,$2,$3,$4,$4,false,0)',
      [otherTripId, ownerId, '台南旅行', '2027-01-20'],
    );
    for (const [id, name, role] of [
      [otherOwnerMemberId, 'Alice', 'owner'],
      [davidId, 'David', 'companion'],
    ])
      await client.query(
        'INSERT INTO trip_members(id,owner_id,trip_id,role,name,is_active,created_at,updated_at) VALUES($1,$2,$3,$4,$5,true,now(),now())',
        [id, ownerId, otherTripId, role, name],
      );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  const members = await world.db.query(
    'SELECT id,owner_id,trip_id,role,name,is_active FROM trip_members WHERE id=ANY($1::uuid[]) ORDER BY name COLLATE "C"',
    [[carolId, otherOwnerMemberId, davidId]],
  );
  expect(members.rows).toEqual([
    {
      id: otherOwnerMemberId,
      owner_id: ownerId,
      trip_id: otherTripId,
      role: 'owner',
      name: 'Alice',
      is_active: true,
    },
    {
      id: carolId,
      owner_id: ownerId,
      trip_id: tripId,
      role: 'companion',
      name: 'Carol',
      is_active: false,
    },
    {
      id: davidId,
      owner_id: ownerId,
      trip_id: otherTripId,
      role: 'companion',
      name: 'David',
      is_active: true,
    },
  ]);
  expect(
    (await world.db.query('SELECT owner_id FROM trips WHERE id=$1', [otherTripId])).rows,
  ).toEqual([{ owner_id: ownerId }]);
  expect(otherTripId).not.toBe(tripId);
  world.splitting.ids.trips.set('台南旅行', otherTripId);
  world.splitting.ids.members.set('David', davidId);
  world.set('splitting:expenseValidationMembers', {
    carolId,
    davidId,
    tripId,
    otherTripId,
    ownerId,
  });
}
