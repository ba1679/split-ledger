import { Given } from '../../support/fixtures.js';
import { arrangeSharedExpenses } from '../../support/accounts-categories-trips.js';

Given('"日本旅行" 與 "台南旅行" 的支出已使用同一個 "餐飲" 分類', async ({ page, world }) => {
  await arrangeSharedExpenses(page, world, '餐飲');
});
