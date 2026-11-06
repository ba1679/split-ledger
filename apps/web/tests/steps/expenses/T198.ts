import { Then } from '../../support/fixtures.js';
import { assertTotal } from '../../support/expense-helpers.js';

Then('畫面顯示 JPY 總額為 10500', async ({ page, world }) => {
  await assertTotal(page, world, 'JPY', '10500');
});
