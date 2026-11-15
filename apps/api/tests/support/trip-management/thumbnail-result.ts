import { expect, type APIResponse } from '@playwright/test';
import sharp from 'sharp';
import type { LedgerWorld } from '../world.js';
import type { TripManagementSnapshot } from './context.js';
import type { ThumbnailRequest } from './thumbnail-request.js';
import { managementSnapshot, sharedSnapshot } from './baseline.js';
import { ownerRead } from './preservation.js';
import { expectedCurrentState } from './rejections.js';

export async function assertThumbnailSaved(
  world: LedgerWorld,
  response: Pick<APIResponse, 'status' | 'json'> = world.response!,
  beforeOverride?: TripManagementSnapshot,
): Promise<void> {
  const request = world.get<ThumbnailRequest>('management:thumbnailRequest');
  const before = beforeOverride ?? world.get<TripManagementSnapshot>('management:before');
  const after = await managementSnapshot(world, request.tripId);

  expect(response.status()).toBe(200);
  expect(after.trips).toHaveLength(1);
  expect(after.thumbnails).toHaveLength(1);
  const row = after.trips[0]!,
    prior = before.trips[0]!;
  const revision = String(BigInt(String(prior.thumbnail_revision)) + 1n);
  const fields = (value: Record<string, unknown>) => {
    const { thumbnail_revision: _thumbnail, updated_at: _updated, ...rest } = value;

    return rest;
  };

  expect(fields(row)).toEqual(fields(prior));
  expect(String(row.thumbnail_revision)).toBe(revision);
  const image = after.thumbnails[0]!;

  expect(image).toMatchObject({ owner_id: row.owner_id, trip_id: request.tripId });
  expect(Buffer.isBuffer(image.image_webp)).toBe(true);
  const bytes = image.image_webp as Buffer;

  expect(bytes.length).toBeGreaterThan(0);
  expect(bytes.length).toBeLessThanOrEqual(524288);
  const decoder = sharp(bytes, { failOn: 'warning', limitInputPixels: 1440000 });
  const metadata = await decoder.metadata();

  expect(metadata).toMatchObject({ format: 'webp', width: image.width, height: image.height });
  expect(metadata.pages ?? 1).toBe(1);
  await decoder.stats();
  const result = {
    operationId: request.operationId,
    kind: 'save_thumbnail',
    state: 'active',
    lifecycleRevision: String(prior.lifecycle_revision),
    thumbnailRevision: revision,
    thumbnailPresent: true,
  };

  expect(await response.json()).toEqual({
    result,
    currentState: expectedCurrentState(after),
  });
  const receipts = after.receipts.filter((receipt) => receipt.operation_id === request.operationId);

  expect(receipts).toHaveLength(1);
  expect(receipts[0]).toMatchObject({
    owner_id: row.owner_id,
    trip_id: request.tripId,
    kind: 'save_thumbnail',
    result_state: 'active',
    result_lifecycle_revision: String(prior.lifecycle_revision),
    result_thumbnail_revision: revision,
    result_thumbnail_present: true,
  });
  expect(Buffer.isBuffer(receipts[0]!.request_fingerprint)).toBe(true);
  expect((receipts[0]!.request_fingerprint as Buffer).length).toBe(32);
  expect(after.receipts.filter((receipt) => receipt.operation_id !== request.operationId)).toEqual(
    before.receipts,
  );
  expect(after.receipts).toHaveLength(before.receipts.length + 1);
  for (const key of [
    'members',
    'expenses',
    'shares',
    'repayments',
    'settlements',
    'adjustments',
    'reservations',
    'categories',
  ] as const)
    expect(after[key]).toEqual(before[key]);
  const current = await ownerRead(world, `/api/trips/${request.tripId}/thumbnail/${revision}`);

  expect(current.status()).toBe(200);
  expect(current.headers()['content-type']).toContain('image/webp');
  expect(current.headers()['cache-control']).toBe('private, no-store');
  expect(current.headers()['x-content-type-options']).toBe('nosniff');
  expect(await current.body()).toEqual(bytes);
  const old = await ownerRead(
    world,
    `/api/trips/${request.tripId}/thumbnail/${String(prior.thumbnail_revision)}`,
  );

  expect(old.status()).toBe(404);
  expect(await old.json()).toMatchObject({ code: 'NOT_FOUND' });
  const trip = await ownerRead(world, `/api/trips/${request.tripId}`);

  expect(trip.status()).toBe(200);
  expect(await trip.json()).toMatchObject({
    id: request.tripId,
    hasThumbnail: true,
    thumbnailRevision: revision,
    lifecycleRevision: String(prior.lifecycle_revision),
    accountingRevision: String(prior.accounting_revision),
  });
  expect(await managementSnapshot(world, request.tripId)).toEqual(after);
  expect(await sharedSnapshot(world)).toEqual(world.get('management:sharedBefore'));
}
