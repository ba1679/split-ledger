import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { test, expect } from '../fixtures.js';
import { TEST_AUTH_SECRET } from '../seed.js';
import { buildApp } from '../../../src/app.js';
import { seedLifecycleBaseline, managementSnapshot, managementTripId } from './baseline.js';
import { selectExactImage, type UploadImage } from './generated-images.js';
import { holdNativeWebpOutput } from './native-image-gate.js';
import { startRawUpload } from './raw-upload.js';
import {
  imageMultipart,
  saveSelectedThumbnail,
  type ThumbnailRequest,
} from './thumbnail-request.js';
import { assertThumbnailSaved } from './thumbnail-result.js';

test('full-job completion waits for native output and abort; a successful completion follows the committed DB result', async ({
  world,
}) => {
  await seedLifecycleBaseline(world, '一般可用');
  await selectExactImage(world, 'PNG', 65536, 64, 48);
  const files = world.get<UploadImage[]>('management:uploadFiles');
  const tripId = managementTripId(world),
    before = await managementSnapshot(world),
    originalId = randomUUID(),
    retryId = randomUUID();
  let originalFinished = 0,
    retryFinished = 0,
    serverClosed = false,
    reached = false;
  const app = buildApp({
    pool: world.db,
    appOrigin: world.get<string>('webOrigin'),
    authSecret: TEST_AUTH_SECRET,
    tripManagementHooks: {
      async afterThumbnailJob(scope) {
        expect(scope.ownerId).toBe(world.users.get('Alice')!.id);
        expect(scope.tripId).toBe(tripId);
        const snapshot = await managementSnapshot(world);
        if (scope.operationId === originalId) {
          expect(snapshot).toEqual(before);
          originalFinished++;
        } else {
          expect(scope.operationId).toBe(retryId);
          expect(snapshot.receipts.find((row) => row.operation_id === retryId)).toMatchObject({
            kind: 'save_thumbnail',
          });
          expect(String(snapshot.trips[0]!.thumbnail_revision)).toBe(
            String(BigInt(String(before.trips[0]!.thumbnail_revision)) + 1n),
          );
          retryFinished++;
        }
      },
    },
  });
  const origin = await app.listen({ host: '127.0.0.1', port: 0 });
  const path = `/api/trips/${tripId}/thumbnail`,
    boundary = `job-${randomUUID()}`,
    body = imageMultipart(files, boundary);
  const headers = {
    cookie: world.users.get('Alice')!.cookie,
    origin: world.get<string>('webOrigin'),
    'content-type': `multipart/form-data; boundary=${boundary}`,
    'X-Operation-Id': originalId,
    'X-Expected-Lifecycle-Revision': String(before.trips[0]!.lifecycle_revision),
    'X-Expected-Thumbnail-Revision': String(before.trips[0]!.thumbnail_revision),
  };
  const observe = (request: IncomingMessage, response: ServerResponse) => {
    if (
      request.method === 'POST' &&
      request.url === path &&
      request.headers['x-operation-id'] === originalId
    )
      response.once('close', () => {
        serverClosed = true;
      });
  };
  app.server.on('request', observe);
  const gate = holdNativeWebpOutput();
  const upload = startRawUpload(new URL(path, origin), headers, body);
  try {
    await gate.waitUntilReached();
    reached = true;
    expect(originalFinished).toBe(0);
    expect(await managementSnapshot(world)).toEqual(before);
    const busy = await world.api.post(new URL(path, origin).toString(), {
      headers: { ...headers, 'X-Operation-Id': randomUUID() },
      data: body,
    });
    expect(busy.status()).toBe(503);
    expect(await busy.json()).toMatchObject({ code: 'UPLOAD_BUSY' });
    upload.abort();
    expect((await upload.result).kind).toBe('closed');
    await expect
      .poll(() => serverClosed, {
        message: 'Observe the actual server socket close before releasing native output',
      })
      .toBe(true);
    expect(originalFinished).toBe(0);
    gate.restore();
    await expect.poll(() => originalFinished).toBe(1);
    expect(await managementSnapshot(world)).toEqual(before);
    world.set('management:thumbnailRequest', {
      tripId,
      operationId: retryId,
      lifecycleRevision: headers['X-Expected-Lifecycle-Revision'],
      thumbnailRevision: headers['X-Expected-Thumbnail-Revision'],
      hashes: files.map((file) => file.asset.sha256),
    } satisfies ThumbnailRequest);
    const retried = await world.api.post(new URL(path, origin).toString(), {
      headers: { ...headers, 'X-Operation-Id': retryId },
      data: body,
    });
    await assertThumbnailSaved(world, retried, before);
    expect(originalFinished).toBe(1);
    expect(retryFinished).toBe(1);
  } finally {
    try {
      gate.restore();
      await upload.dispose();
      if (reached) await expect.poll(() => originalFinished).toBe(1);
    } finally {
      app.server.off('request', observe);
      await app.close();
    }
  }
});

test('thumbnail upload stays multipart-only before a large JSON body reaches the JSON parser', async ({
  world,
}) => {
  await seedLifecycleBaseline(world, '一般可用');
  const tripId = managementTripId(world),
    before = await managementSnapshot(world);
  const response = await world.api.post(`/api/trips/${tripId}/thumbnail`, {
    headers: {
      cookie: world.users.get('Alice')!.cookie,
      origin: world.get<string>('webOrigin'),
      'content-type': 'application/json',
      'X-Operation-Id': randomUUID(),
      'X-Expected-Lifecycle-Revision': String(before.trips[0]!.lifecycle_revision),
      'X-Expected-Thumbnail-Revision': String(before.trips[0]!.thumbnail_revision),
    },
    data: Buffer.from(JSON.stringify({ file: 'x'.repeat(1100000) })),
  });
  expect(response.status()).toBe(400);
  expect(await response.json()).toMatchObject({ code: 'VALIDATION_ERROR' });
  expect(await managementSnapshot(world)).toEqual(before);
  await selectExactImage(world, 'PNG', 65536, 64, 48);
  await saveSelectedThumbnail(world);
  await assertThumbnailSaved(world);
});
