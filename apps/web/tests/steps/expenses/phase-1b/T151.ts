import { When } from '../../../support/fixtures.js';
import { changeExpenseAmount } from '../../../support/splitting/change-expense-amount.js';

When('owner 將點心金額改為 JPY 200', async ({ page, world }) => {
  await changeExpenseAmount(page, world, '點心', '200');
});
