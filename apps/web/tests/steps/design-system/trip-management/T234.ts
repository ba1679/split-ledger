import { Given } from '../../../support/fixtures.js';
import { arrangeRecoveredOptions } from '../../../support/loading/options-recovered.js';

Given('所有必要支出選項已由等待恢復成功', async ({ page, world }) => {
  await arrangeRecoveredOptions(page, world);
});
