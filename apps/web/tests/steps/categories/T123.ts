import { When } from '../../support/fixtures.js';
import { categoryRename } from '../../support/accounts-categories-trips.js';

When('使用者將 "餐飲" 分類改名為 "吃喝"', async ({ page }) => {
  await categoryRename(page, '吃喝');
});
