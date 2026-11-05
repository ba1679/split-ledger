import { Given } from '../../support/fixtures.js';
import { arrangeSharedExpenses } from '../../support/accounts-categories-trips.js';

Given('"吃喝" 分類正被兩筆支出使用', async ({ page, world }) => {
  await arrangeSharedExpenses(page, world, '吃喝');
});
