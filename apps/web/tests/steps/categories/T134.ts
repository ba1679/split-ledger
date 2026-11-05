import { When } from '../../support/fixtures.js';
import { clearAndSave } from '../../support/accounts-categories-trips.js';

When('使用者清除分類並保存支出', async ({ page }) => {
  await clearAndSave(page);
});
