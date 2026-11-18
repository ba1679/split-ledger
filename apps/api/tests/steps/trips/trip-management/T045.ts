import { When } from '../../../support/fixtures.js';
import { saveSelectedThumbnail } from '../../../support/trip-management/thumbnail-request.js';

When('owner 保存待選圖片為旅行縮圖', async ({ world }) => {
  await saveSelectedThumbnail(world);
});
