import { Then } from '../../support/fixtures.js';
import { assertTotal, assertExpense } from '../../support/expense-helpers.js';

Then("帳本顯示午餐為 JPY 1200", async ({ page, world }) => {
 await assertExpense(page, world, '午餐', '1200', 'JPY'); await assertTotal(page, world, 'JPY', '1200');
});
