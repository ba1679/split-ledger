import { Then } from '../../../support/fixtures.js';
import { assertLoginBusy } from '../../../support/loading/login-busy.js';

Then('登入控制顯示圖形與可理解的登入狀態', async ({ world }) => {
  await assertLoginBusy(world);
});
