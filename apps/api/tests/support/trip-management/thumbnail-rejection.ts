import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import type { TripManagementSnapshot } from './context.js';
import type { ThumbnailRequest } from './thumbnail-request.js';
import { managementSnapshot, sharedSnapshot } from './baseline.js';
import { ownerRead } from './preservation.js';
import { expectedCurrentState } from './rejections.js';

const imageErrors: Record<string, { status: number; code: string }> = {
  超過10MiB: { status: 413, code: 'IMAGE_TOO_LARGE' },
  超過25000000像素: { status: 413, code: 'IMAGE_TOO_LARGE' },
  超過單邊16384px: { status: 413, code: 'IMAGE_TOO_LARGE' },
  多張圖片: { status: 413, code: 'IMAGE_TOO_LARGE' },
  不支援格式: { status: 415, code: 'UNSUPPORTED_IMAGE_TYPE' },
  動畫: { status: 415, code: 'UNSUPPORTED_IMAGE_TYPE' },
  內容損壞: { status: 422, code: 'INVALID_IMAGE' },
  非法尺寸: { status: 422, code: 'INVALID_IMAGE' },
  空檔: { status: 400, code: 'VALIDATION_ERROR' },
};

export async function assertImageRejected(world: LedgerWorld, reason: string): Promise<void> {
  expect(Object.keys(imageErrors)).toContain(reason);
  const expected = imageErrors[reason]!;
  const request = world.get<ThumbnailRequest>('management:thumbnailRequest');
  const before = world.get<TripManagementSnapshot>('management:before');

  expect(world.response!.status()).toBe(expected.status);
  const body = await world.response!.json();

  expect(body).toMatchObject({ code: expected.code, message: expect.any(String) });
  expect(body.message.trim().length).toBeGreaterThan(0);
  const after = await managementSnapshot(world);

  expect(
    after,
    'Failed decoding/limits leave all bytes, revisions, reservations and accounting untouched',
  ).toEqual(before);
  expect(after.receipts.some((row) => row.operation_id === request.operationId)).toBe(false);
  expect(await sharedSnapshot(world)).toEqual(world.get('management:sharedBefore'));
  expect(before.thumbnails).toHaveLength(1);
  const original = await ownerRead(
    world,
    `/api/trips/${request.tripId}/thumbnail/${request.thumbnailRevision}`,
  );

  expect(original.status()).toBe(200);
  expect(original.headers()['content-type']).toContain('image/webp');
  expect(original.headers()['cache-control']).toBe('private, no-store');
  expect(original.headers()['x-content-type-options']).toBe('nosniff');
  expect(await original.body()).toEqual(before.thumbnails[0]!.image_webp);
  const state = await ownerRead(world, `/api/trips/${request.tripId}/state`);

  expect(state.status()).toBe(200);
  expect(await state.json()).toEqual(expectedCurrentState(before));
  expect(await managementSnapshot(world)).toEqual(before);
}
