import type { BrowserContext } from '@playwright/test';
import { Then } from '../../../support/fixtures.js';
import { assertPreparedThumbnail } from '../../../support/thumbnail/prepared-result.js';

Then('另一裝置可讀相同旅行的已保存縮圖', async ({ world, browser }) => {
  const other = world.get<BrowserContext>('management:photoOtherContext');
  await assertPreparedThumbnail(world, browser, other);
});
