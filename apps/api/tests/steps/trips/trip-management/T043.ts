import { Then, expect } from '../../../support/fixtures.js';
import type { PendingImage } from '../../../support/trip-management/pending-image.js';
import type { TripManagementSnapshot } from '../../../support/trip-management/context.js';
import { managementSnapshot } from '../../../support/trip-management/baseline.js';
import { assertRejectedCommand } from '../../../support/trip-management/rejections.js';
import { ownerRead } from '../../../support/trip-management/preservation.js';

Then('新圖片未落地且已生效的旅行狀態保持', async ({ world }) => {
  const upload = world.get<PendingImage>('management:pendingImage');
  const before = world.get<TripManagementSnapshot>('management:before');
  const row = before.trips[0];

  expect(before).toEqual(world.get('management:firstCommitted'));
  const code = !row
    ? 'TRIP_PURGED'
    : row.deleted_at !== null
      ? 'TRIP_TRASHED'
      : 'TRIP_STATE_CHANGED';

  if (row?.deleted_at === null)
    expect(String(row.lifecycle_revision)).not.toBe(upload.lifecycleRevision);
  await assertRejectedCommand(world, code);
  const after = await managementSnapshot(world);

  expect(after.receipts.some((receipt) => receipt.operation_id === upload.operationId)).toBe(false);
  if (!row) {
    expect(after.thumbnails).toEqual([]);
    for (const prefix of [`/api/trips/${upload.tripId}`, `/api/trips/trash/${upload.tripId}`]) {
      const response = await ownerRead(world, `${prefix}/thumbnail/${upload.thumbnailRevision}`);

      expect(response.status()).toBe(404);
      expect(await response.json()).toMatchObject({ code: 'NOT_FOUND' });
    }
  } else {
    expect(after.thumbnails).toHaveLength(1);
    expect(after.thumbnails[0]!.image_webp).toEqual(world.get<Buffer>('management:originalImage'));
    const path =
      row.deleted_at !== null
        ? `/api/trips/trash/${upload.tripId}/thumbnail/${String(row.thumbnail_revision)}`
        : `/api/trips/${upload.tripId}/thumbnail/${String(row.thumbnail_revision)}`;
    const current = await ownerRead(world, path);

    expect(current.status()).toBe(200);
    expect(await current.body()).toEqual(after.thumbnails[0]!.image_webp);
    if (row.deleted_at !== null) {
      const ordinary = await ownerRead(
        world,
        `/api/trips/${upload.tripId}/thumbnail/${upload.thumbnailRevision}`,
      );

      expect(ordinary.status()).toBe(409);
      expect(await ordinary.json()).toMatchObject({ code: 'TRIP_TRASHED' });
    }
  }
  expect(await managementSnapshot(world)).toEqual(before);
});
