import { When } from '../../support/fixtures.js';
import { categoryCreate } from '../../support/accounts-categories-trips.js';

When('使用者建立 "交通" 分類', async ({ page, world }) => {
  await categoryCreate(page, world, '交通');
});
