import { Given } from '../../../support/fixtures.js';
import { arrangeThumbnailRead } from '../../../support/thumbnail/read-fixture.js';

Given('旅行縮圖的讀取將 {string}', async ({ page, world }, result: string) => {
  await arrangeThumbnailRead(page, world, result);
});
