import { Then } from '../../../support/fixtures.js';
import { assertThumbnailFailure } from '../../../support/thumbnail/failure-result.js';

Then('圖片失敗有下一步且草稿仍為 {string}', async ({ world }, selected: string) => {
  await assertThumbnailFailure(world, selected);
});
