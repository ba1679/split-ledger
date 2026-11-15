import { randomUUID } from 'node:crypto';
import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import { seedIdentity } from '../seed.js';
import { managementSnapshot, managementTripId, sharedSnapshot } from './baseline.js';
import { executeOwnerTripCommand, type RecordedTripCommand } from './commands.js';

export interface AccessContext {
  actor: 'Carol' | 'Amy' | '訪客';
  cookie?: string;
  tripId: string;
  operationId: string;
  unknownTripId: string;
  unknownOperationId: string;
  lifecycleRevision: string;
  thumbnailRevision: string;
  state: 'active' | 'trash';
}

export async function arrangeAccessActor(world: LedgerWorld, actor: string): Promise<void> {
  expect(['Carol', 'Amy', '訪客']).toContain(actor);
  const baseline = await managementSnapshot(world);
  const wasTrash = baseline.trips[0]!.deleted_at !== null;

  // Produce a real persisted receipt, while leaving the original lifecycle state in place.
  for (const operation of wasTrash ? ['復原', '移至垃圾桶'] : ['移至垃圾桶', '復原']) {
    await executeOwnerTripCommand(world, operation);
    expect(world.response!.status(), 'Access Given needs an actual owner receipt').toBe(200);
  }
  const previous = world.get<RecordedTripCommand>('management:lastCommand');
  const identity = actor === '訪客' ? undefined : await seedIdentity(world, actor);
  const tripId = managementTripId(world);
  const current = await managementSnapshot(world);
  const unknownTripId = randomUUID(),
    unknownOperationId = randomUUID();

  expect(current.trips[0]!.deleted_at !== null).toBe(wasTrash);
  expect(current.receipts.some((row) => row.operation_id === previous.operationId)).toBe(true);
  expect(
    (
      await world.db.query('SELECT trip_id FROM trip_id_reservations WHERE trip_id=$1', [
        unknownTripId,
      ])
    ).rows,
  ).toEqual([]);
  expect(
    (
      await world.db.query(
        'SELECT operation_id FROM trip_operation_receipts WHERE operation_id=$1',
        [unknownOperationId],
      )
    ).rows,
  ).toEqual([]);
  if (actor === 'Amy') {
    expect(identity!.id).not.toBe(world.users.get('Alice')!.id);
    expect(current.members.find((row) => row.name === 'Amy')).toMatchObject({
      role: 'companion',
      is_active: true,
    });
  }
  const context: AccessContext = {
    actor: actor as AccessContext['actor'],
    cookie: identity?.cookie,
    tripId,
    operationId: previous.operationId,
    unknownTripId,
    unknownOperationId,
    lifecycleRevision: String(current.trips[0]!.lifecycle_revision),
    thumbnailRevision: String(current.trips[0]!.thumbnail_revision),
    state: wasTrash ? 'trash' : 'active',
  };

  world.set('management:access', context);
  world.set('management:before', current);
  world.set('management:sharedBefore', await sharedSnapshot(world));
}
