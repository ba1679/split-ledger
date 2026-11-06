import { When } from '../../support/fixtures.js';
import { categoryCreate } from '../../support/accounts-categories-trips.js';

When('使用者建立 30 個餐字的分類', async ({ page, world }) => {
  await categoryCreate(page, world, '餐'.repeat(30));
});
