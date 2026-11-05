import { When } from '../../support/fixtures.js';
import { edit } from '../../support/expense-helpers.js';

When("使用者將餐費修改為 JPY 2500", async ({ page, world }) => {
 await edit(page, world, '餐費', '2500');
});
