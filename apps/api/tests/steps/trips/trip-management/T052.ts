import { Then } from '../../../support/fixtures.js';
import { assertThumbnailReset } from '../../../support/trip-management/thumbnail-reset-result.js';

Then('旅行使用預設圖且舊自訂圖不可再取得', async ({ world }) => {
  await assertThumbnailReset(world);
});
