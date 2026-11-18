import { Then } from '../../../support/fixtures.js';
import { assertThumbnailSaved } from '../../../support/trip-management/thumbnail-result.js';

Then('有效圖片保存為唯一目前縮圖', async ({ world }) => {
  await assertThumbnailSaved(world);
});
