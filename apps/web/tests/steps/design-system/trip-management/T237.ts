import { Given } from '../../../support/fixtures.js';
import { arrangeOfflineRecovery } from '../../../support/loading/offline-recovery.js';

Given('旅行清單正在等待連線且網路即將恢復', async ({ page, world }) => {
  await arrangeOfflineRecovery(page, world);
});
