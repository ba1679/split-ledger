import { Then } from '../../../support/fixtures.js';
import { assertIncompleteUploadFailed } from '../../../support/thumbnail/incomplete-result.js';

Then('上傳等待結束且原縮圖與帳務維持', async ({ world }) => {
  await assertIncompleteUploadFailed(world);
});
