import { Then } from '../../../support/fixtures.js';
import { assertInitialPaused } from '../../../support/loading/initial-paused.js';

Then('畫面顯示等待連線而非無限處理中', async ({ world }) => {
  await assertInitialPaused(world);
});
