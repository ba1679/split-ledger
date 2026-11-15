import { Given } from '../../../support/fixtures.js';
import { arrangePendingImage } from '../../../support/trip-management/pending-image.js';

Given('本次新圖片已開始處理但尚未提交', async ({ world }) => {
  await arrangePendingImage(world);
});
