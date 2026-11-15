import { Given } from '../../../support/fixtures.js';
import { armThumbnailFailure } from '../../../support/thumbnail/failure-fixture.js';

Given('本次圖片保存將明確失敗且確定未提交', async ({ world }) => {
  await armThumbnailFailure(world);
});
