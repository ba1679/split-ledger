import { When } from '../../../support/fixtures.js';
import { startLogin } from '../../../support/loading/start-login.js';

When('使用者開始站內Google登入', async ({ world }) => {
  await startLogin(world);
});
