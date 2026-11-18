import { Then } from '../../../support/fixtures.js';
import { assertThumbnailFallback } from '../../../support/thumbnail/fallback-result.js';

Then('縮圖使用預設呈現且等待已結束', async ({ world }) => {
  await assertThumbnailFallback(world);
});
