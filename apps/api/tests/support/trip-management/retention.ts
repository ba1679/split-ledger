import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import { seedSession } from '../seed.js';
import { managementSnapshot, managementTripId, sharedSnapshot } from './baseline.js';

export async function retainTrashFor180Days(world: LedgerWorld): Promise<void> {
  const tripId = managementTripId(world);
  const snapshot = await managementSnapshot(world);

  expect(snapshot.trips).toHaveLength(1);
  expect(snapshot.trips[0]!.deleted_at).not.toBeNull();
  const databaseNow = (await world.db.query<{ now: Date }>('SELECT now() AS now')).rows[0]!.now;
  let instant = databaseNow.getTime();
  const clock = {
    now: () => new Date(instant),
    advance(milliseconds: number) {
      instant += milliseconds;
    },
  };
  const duration = 180 * 24 * 60 * 60 * 1000;

  clock.advance(-duration);
  const deletedAt = clock.now();

  clock.advance(duration);
  world.tripManagement.clock = clock;
  await world.db.query('UPDATE trips SET deleted_at=$1 WHERE id=$2', [deletedAt, tripId]);
  const current = await managementSnapshot(world);

  expect((current.trips[0]!.deleted_at as Date).getTime()).toBe(deletedAt.getTime());
  expect(clock.now().getTime() - deletedAt.getTime()).toBe(duration);
  const expected = structuredClone(snapshot);

  expected.trips[0]!.deleted_at = deletedAt;
  expect(current, 'Only arrangement age changes; no expiration task or purge runs').toEqual(
    expected,
  );
  const identity = await seedSession(world, 'Alice');

  world.users.set('Alice', identity);
  world.tripManagement.snapshot = current;
  world.set('management:before', current);
  world.set('management:sharedBefore', await sharedSnapshot(world));
  world.set('management:retainedTripId', tripId);
}
