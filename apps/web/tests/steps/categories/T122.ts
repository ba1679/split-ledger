import { When } from '../../support/fixtures.js';
import { categoryRename } from '../../support/accounts-categories-trips.js';

When('使用者將 "餐飲" 分類改名為 "food"', async ({ page }) => {
  await categoryRename(page, 'food');
});
