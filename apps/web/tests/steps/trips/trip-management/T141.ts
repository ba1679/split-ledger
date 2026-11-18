import { Given } from '../../../support/fixtures.js';
import { arrangeSelectionRetry } from '../../../support/thumbnail/retry-selection.js';

Given('前次選圖已因 {string} 被拒絕且現在備有合法JPEG', async ({ page, world }, reason: string) => {
  await arrangeSelectionRetry(page, world, reason);
});
