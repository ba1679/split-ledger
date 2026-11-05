import { When } from '../../support/fixtures.js';
import { categoryRename } from '../../support/accounts-categories-trips.js';

When('使用者將 "餐飲" 分類保存為原名', async ({ page }) => {
  await categoryRename(page, '餐飲');
});
