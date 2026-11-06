import { Then } from '../../support/fixtures.js';
import { assertTotal, assertExpense } from '../../support/expense-helpers.js';

Then('使用者看到已保存支出與分幣別總額', async ({ page, world }) => {
  await assertExpense(page, world, '午餐', '1200', 'JPY');
  await assertTotal(page, world, 'JPY', '1200');
});
