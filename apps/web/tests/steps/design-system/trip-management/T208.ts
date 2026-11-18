import { Given } from '../../../support/fixtures.js';
import { arrangeBackgroundRecovery } from '../../../support/loading/background-recovery.js';

Given('背景更新已失敗且連線恢復', async ({ page, world }) => {
  await arrangeBackgroundRecovery(page, world);
});
