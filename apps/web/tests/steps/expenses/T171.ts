import { When } from '../../support/fixtures.js';
import { edit } from '../../support/expense-helpers.js';

When('使用者將機票修改為 JPY 8000', async ({ page, world }) => {
  await edit(page, world, '機票', '8000', 'JPY');
});
