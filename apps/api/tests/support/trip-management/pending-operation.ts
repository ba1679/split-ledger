import { randomUUID } from 'node:crypto';
import { expect, type APIResponse } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import type { RecordedTripCommand } from './commands.js';
import { managementSnapshot, managementTripId, sharedSnapshot } from './baseline.js';
import { holdTripRow } from './row-lock.js';

export async function arrangeUncommittedOperation(world: LedgerWorld): Promise<void> {
  const tripId = managementTripId(world);
  const before = await managementSnapshot(world);

  expect(before.trips[0]!.deleted_at).toBeNull();
  const barrier = await holdTripRow(world, tripId);
  const operationId = randomUUID();
  const command: RecordedTripCommand = {
    tripId,
    operationId,
    kind: 'move_to_trash',
    method: 'POST',
    path: `/api/trips/${tripId}/trash`,
    headers: { cookie: world.users.get('Alice')!.cookie, origin: world.get('webOrigin') },
    data: { operationId, expectedLifecycleRevision: String(before.trips[0]!.lifecycle_revision) },
  };
  let completion: Promise<{ response?: APIResponse; error?: unknown }> | undefined = undefined;
  let disposed = false;
  const cleanup = async () => {
    if (disposed) return;
    disposed = true;
    await barrier.release();
    if (completion) {
      const result = await completion;

      if (result.error) throw result.error;
      try {
        world.set('management:pendingFinalStatus', result.response!.status());
        expect(
          result.response!.status(),
          'After releasing the barrier the original command can commit',
        ).toBe(200);
      } finally {
        await result.response?.dispose();
      }
    }
  };

  world.tripManagement.cleanups.add(cleanup);
  world.tripManagement.cleanups.delete(barrier.release);
  completion = world.api
    .post(command.path, { headers: command.headers, data: command.data, timeout: 15000 })
    .then(
      (response) => ({ response }),
      (error) => ({ error }),
    );
  await barrier.waitForBlockedWriter();
  expect(
    (
      await world.db.query(
        'SELECT operation_id FROM trip_operation_receipts WHERE owner_id=$1 AND operation_id=$2',
        [world.users.get('Alice')!.id, operationId],
      )
    ).rows,
  ).toEqual([]);
  expect(await managementSnapshot(world)).toEqual(before);
  world.set('management:originalCommand', command);
  world.set('management:pendingBarrier', barrier);
  world.set('management:before', before);
  world.set('management:sharedBefore', await sharedSnapshot(world));
}
