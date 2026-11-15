import { Given } from '../../../support/fixtures.js';
import { arrangeLoginWait } from '../../../support/loading/login-wait.js';

Given('使用者未登入且站內Google登入將延遲', async ({ page, world }) => {
  await arrangeLoginWait(page, world);
});
