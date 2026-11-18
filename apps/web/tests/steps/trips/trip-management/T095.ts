import { Given } from '../../../support/fixtures.js';
import { arrangeResolvedThumbnailFailure } from '../../../support/thumbnail/failure-fixture.js';

Given('前次圖片明確失敗已解除且草稿仍可用', async ({ world }) => {
  await arrangeResolvedThumbnailFailure(world);
});
