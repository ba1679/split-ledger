import { When } from '../../support/fixtures.js';
import { categoryCreate } from '../../support/accounts-categories-trips.js';

When('使用者建立名稱為 " 餐飲 " 的分類', async ({ page, world }) => {
  await categoryCreate(page, world, ' 餐飲 ');
});
