import { Given } from '../../../support/fixtures.js';
import { arrangeExpenseSaveRecovery } from '../../../support/loading/expense-save-recovery.js';

Given('前次支出保存明確失敗已解除且草稿保留', async ({ page, world }) => {
  await arrangeExpenseSaveRecovery(page, world);
});
