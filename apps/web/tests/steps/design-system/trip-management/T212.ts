import { Given } from '../../../support/fixtures.js';
import { arrangeInitialRecovery } from '../../../support/loading/initial-recovery.js';

Given('旅行初讀已失敗且現在可成功取得清單', async ({ page, world }) => {
  await arrangeInitialRecovery(page, world);
});
