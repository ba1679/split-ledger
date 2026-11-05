import { Given } from '../../support/fixtures.js';
import { arrangeCategories } from '../../support/accounts-categories-trips.js';

Given('使用者已登入且在分類管理頁', async ({ page, world }) => {
  await arrangeCategories(page, world, []);
});
