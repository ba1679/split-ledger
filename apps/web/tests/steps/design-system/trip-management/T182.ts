import { Given } from '../../../support/fixtures.js';
import { arrangeAuthWait } from '../../../support/loading/auth-wait.js';

Given('站內身分確認尚未完成', async ({ page, world }) => {
  await arrangeAuthWait(page, world);
});
