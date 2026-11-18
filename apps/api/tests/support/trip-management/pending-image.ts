import { randomUUID, createHash } from 'node:crypto';
import { expect, type APIResponse } from '@playwright/test';
import sharp from 'sharp';
import type { LedgerWorld } from '../world.js';
import { managementSnapshot, managementTripId, sharedSnapshot } from './baseline.js';
import { holdNativeWebpOutput } from './native-image-gate.js';

export interface PendingImage {
  operationId: string;
  tripId: string;
  inputHash: string;
  lifecycleRevision: string;
  thumbnailRevision: string;
  release(): void;
  response(): Promise<APIResponse>;
}

export async function arrangePendingImage(world: LedgerWorld): Promise<void> {
  const before = await managementSnapshot(world);
  const tripId = managementTripId(world);
  const row = before.trips[0]!;

  expect(row.deleted_at).toBeNull();
  const input = await sharp({
    create: { width: 64, height: 48, channels: 3, background: '#e94b35' },
  })
    .png()
    .toBuffer();
  const operationId = randomUUID();
  const gate = holdNativeWebpOutput();
  let finished = false;
  let pending: Promise<{ response?: APIResponse; error?: unknown }> | undefined = undefined;
  let disposed = false;
  const cleanup = async () => {
    if (disposed) return;
    disposed = true;
    gate.restore();
    if (pending) {
      const outcome = await pending;

      if (outcome.error) throw outcome.error;
      await outcome.response?.dispose();
    }
  };

  world.tripManagement.cleanups.add(cleanup);
  pending = world.api
    .post(`/api/trips/${tripId}/thumbnail`, {
      headers: {
        cookie: world.users.get('Alice')!.cookie,
        origin: world.get('webOrigin'),
        'X-Operation-Id': operationId,
        'X-Expected-Lifecycle-Revision': String(row.lifecycle_revision),
        'X-Expected-Thumbnail-Revision': String(row.thumbnail_revision),
      },
      multipart: { image: { name: 'new.png', mimeType: 'image/png', buffer: input } },
      timeout: 15000,
    })
    .then(
      (response) => {
        finished = true;

        return { response };
      },
      (error) => {
        finished = true;

        return { error };
      },
    );
  await gate.waitUntilReached();
  expect(finished, 'The original upload must still be held before commit').toBe(false);
  expect(
    await managementSnapshot(world),
    'Native conversion may not commit through the barrier',
  ).toEqual(before);
  const handle: PendingImage = {
    operationId,
    tripId,
    inputHash: createHash('sha256').update(input).digest('hex'),
    lifecycleRevision: String(row.lifecycle_revision),
    thumbnailRevision: String(row.thumbnail_revision),
    release: () => gate.release(),
    async response() {
      const outcome = await pending!;

      if (outcome.error) throw outcome.error;
      expect(outcome.response).toBeDefined();

      return outcome.response!;
    },
  };

  world.set('management:pendingImage', handle);
  world.set('management:before', before);
  world.set('management:sharedBefore', await sharedSnapshot(world));
}
