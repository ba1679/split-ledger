import { Given } from '../../../support/fixtures.js';
import { arrangeLoginWait } from '../../../support/loading/login-wait.js';
import { startLogin } from '../../../support/loading/start-login.js';
import { assertLoginBusy } from '../../../support/loading/login-busy.js';

Given('原次站內登入正在等待且隨後會成功返回', async ({ page, world }) => {
  await arrangeLoginWait(page, world);
  await startLogin(world);
  await assertLoginBusy(world);
});
