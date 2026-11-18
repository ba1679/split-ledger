import { When } from '../../../support/fixtures.js';
import type { PendingImage } from '../../../support/trip-management/pending-image.js';
import { managementSnapshot, sharedSnapshot } from '../../../support/trip-management/baseline.js';

When('原次圖片處理完成並嘗試保存', async ({ world }) => {
  const upload = world.get<PendingImage>('management:pendingImage');

  world.set('management:before', await managementSnapshot(world));
  world.set('management:sharedBefore', await sharedSnapshot(world));
  upload.release();
  world.response = await upload.response();
});
