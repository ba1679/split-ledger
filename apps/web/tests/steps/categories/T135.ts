import { Then } from '../../support/fixtures.js';
import { assertSharedClassification } from '../../support/accounts-categories-trips.js';

Then('兩筆支出都顯示 "餐飲" 分類', async ({ page, world }) => {
  await assertSharedClassification(page, world, '餐飲');
});
