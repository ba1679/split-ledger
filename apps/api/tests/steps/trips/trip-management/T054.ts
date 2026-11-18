import { Then, expect } from '../../../support/fixtures.js';
import type { TripManagementSnapshot } from '../../../support/trip-management/context.js';
import { managementSnapshot, sharedSnapshot } from '../../../support/trip-management/baseline.js';

Then('圖片讀取符合 {string} 的私有契約', async ({ world }, result: string) => {
  const before = world.get<TripManagementSnapshot>('management:before');
  const response = world.response!;
  const path = world.get<string>('management:thumbnailReadPath');
  const url = new URL(path, world.origin);

  expect(url.search).toBe('');
  expect(url.username).toBe('');
  expect(url.password).toBe('');
  if (result === '可讀') {
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toMatch(/^image\/webp(?:;|$)/);
    expect(response.headers()['cache-control']).toBe('private, no-store');
    expect(response.headers()['x-content-type-options']).toBe('nosniff');
    expect(before.thumbnails).toHaveLength(1);
    expect(await response.body()).toEqual(before.thumbnails[0]!.image_webp);
  } else {
    expect(['不存在', '垃圾桶拒絕']).toContain(result);
    expect(response.status()).toBe(result === '不存在' ? 404 : 409);
    expect(response.headers()['content-type']).toContain('application/json');
    expect(await response.json()).toMatchObject({
      code: result === '不存在' ? 'NOT_FOUND' : 'TRIP_TRASHED',
    });
    expect(await response.body()).not.toEqual(world.get<Buffer>('management:originalImage'));
  }
  expect(await managementSnapshot(world)).toEqual(before);
  expect(await sharedSnapshot(world)).toEqual(world.get('management:sharedBefore'));
});
