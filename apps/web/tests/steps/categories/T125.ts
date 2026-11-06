import { Given } from '../../support/fixtures.js';
import { arrangeCategories } from '../../support/accounts-categories-trips.js';

Given('使用者已有 "Food" 與 "餐飲" 分類', async ({ page, world }) => {
  await arrangeCategories(page, world, ['Food', '餐飲']);
});
