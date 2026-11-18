import { Given } from '../../../support/fixtures.js';
import { arrangeThumbnailConflict } from '../../../support/thumbnail/conflict-fixture.js';

Given(
  '其他裝置已使縮圖提交的 {string} 過期',
  async ({ page, browser, world }, conflict: string) => {
    await arrangeThumbnailConflict(page, browser, world, conflict);
  },
);
