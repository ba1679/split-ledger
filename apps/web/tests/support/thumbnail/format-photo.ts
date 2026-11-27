import { tripEditor } from '../home-navigation.js';
import { expect, type Browser, type Page } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import {
  managementSnapshot,
  managementTripId,
  sharedSnapshot,
} from '../../../../api/tests/support/trip-management/baseline.js';
import {
  selectExactImage,
  type UploadImage,
} from '../../../../api/tests/support/trip-management/generated-images.js';
import { ownerRead } from '../../../../api/tests/support/trip-management/preservation.js';
import {
  arrangeManagementPage,
  managementUI,
  waitForManagementReads,
} from '../trips/management-fixture.js';

export async function arrangeFormatPhoto(
  page: Page,
  browser: Browser,
  world: LedgerWorld,
  device: string,
  format: string,
): Promise<void> {
  expect(['手機', '桌面電腦']).toContain(device);
  expect(['JPEG .jpg', 'JPEG .jpeg', 'PNG', 'WebP']).toContain(format);
  await page.setViewportSize(
    device === '手機' ? { width: 390, height: 844 } : { width: 1440, height: 900 },
  );
  await arrangeManagementPage(page, world, '縮圖編輯');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  const tripId = managementTripId(world);
  const client = await world.db.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM trip_thumbnails WHERE trip_id=$1', [tripId]);
    await client.query('UPDATE trips SET thumbnail_revision=thumbnail_revision+1 WHERE id=$1', [
      tripId,
    ]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  const before = await managementSnapshot(world);
  expect(before.thumbnails).toEqual([]);
  expect(before.trips[0]!.deleted_at).toBeNull();
  world.set('management:before', before);
  // Read the fixture's default state afresh before opening the actual editing flow.
  await page.reload();
  await expect(page.getByRole('heading', { name: '日本旅行', exact: true })).toBeVisible();
  await tripEditor(page).click();
  await page.getByRole('menuitem', { name: '更換縮圖', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('img[src*="/thumbnail/"],img[src^="blob:"]')).toHaveCount(0);
  await expect(dialog.locator('.landscape:visible,[role="img"]:visible').first()).toBeVisible();
  await waitForManagementReads(managementUI(world));
  const trip = await ownerRead(world, `/api/trips/${tripId}`);
  expect(trip.status()).toBe(200);
  expect(await trip.json()).toMatchObject({
    id: tripId,
    hasThumbnail: false,
    thumbnailRevision: String(before.trips[0]!.thumbnail_revision),
  });
  await selectExactImage(world, format, 1048576, 4000, 3000);
  const file = world.get<UploadImage[]>('management:uploadFiles')[0]!;
  const other = await browser.newContext({
    baseURL: world.get<string>('webOrigin'),
    viewport: device === '手機' ? { width: 1440, height: 900 } : { width: 390, height: 844 },
  });
  world.tripManagement.cleanups.add(async () => {
    await other.close();
  });
  await other.addCookies(await page.context().cookies());
  const me = await other.request.get('/api/me');
  expect(me.status()).toBe(200);
  expect(await me.json()).toMatchObject({ id: world.users.get('Alice')!.id });
  world.set('management:photoOtherContext', other);
  world.set('management:formatPhoto', { device, format, file });
  world.set('management:declaredDevice', device);
  world.set('management:writeStart', 0);
  expect(managementUI(world).writes.length).toBe(0);
  expect(await managementSnapshot(world)).toEqual(before);
  expect(await sharedSnapshot(world)).toEqual(world.get('management:sharedBefore'));
}
