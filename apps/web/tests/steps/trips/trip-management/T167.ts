import { Then } from '../../../support/fixtures.js';
import { assertPreparedThumbnail } from '../../../support/thumbnail/prepared-result.js';

Then('重試圖片保存成功且沒有殘留等待', async ({ world, browser }) => {
  await assertPreparedThumbnail(world, browser);
});
