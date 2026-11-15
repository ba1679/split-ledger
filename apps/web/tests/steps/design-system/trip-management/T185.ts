import { Given } from '../../../support/fixtures.js';
import { arrangeOptionWait } from '../../../support/loading/option-wait.js';

Given('新增支出必要選項 {string} 尚在讀取', async ({ page, world }, option: string) => {
  await arrangeOptionWait(page, world, option);
});
