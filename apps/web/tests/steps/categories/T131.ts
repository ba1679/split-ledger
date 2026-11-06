import { When } from '../../support/fixtures.js';
import { categoryCreate } from '../../support/accounts-categories-trips.js';

When('使用者建立只有空白名稱的分類', async ({ page, world }) => {
  await categoryCreate(page, world, '   ');
});
