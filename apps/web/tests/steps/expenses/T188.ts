import { Then } from '../../support/fixtures.js';
import { assertTotal, assertExpense } from '../../support/expense-helpers.js';

Then('帳本顯示飲料為 USD 12.50', async ({ page, world }) => {
  await assertExpense(page, world, '飲料', '12.50', 'USD');
  await assertTotal(page, world, 'USD', '12.50');
});
