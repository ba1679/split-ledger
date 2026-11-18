import { Then } from '../../../support/fixtures.js';
import { assertPreparedThumbnail } from '../../../support/thumbnail/prepared-result.js';

Then('合法新圖可讀取且錯誤與等待已結束', async ({ world, browser }) => {
  await assertPreparedThumbnail(world, browser);
});
