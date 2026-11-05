import { When } from '../../support/fixtures.js';
import { clearAndSave } from '../../support/accounts-categories-trips.js';

When('使用者將午餐支出改為未分類', async ({ page }) => {
  await clearAndSave(page);
});
