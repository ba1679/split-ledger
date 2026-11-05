import { Given } from '../../support/fixtures.js';
import { arrangeSharedExpenses } from '../../support/accounts-categories-trips.js';

Given('"吃喝" 分類未被支出使用且原支出仍存在', async ({ page, world }) => {
  await arrangeSharedExpenses(page, world, '吃喝', false);
});
