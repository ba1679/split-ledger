import { When } from '../../../support/fixtures.js';
import { changeOriginalExpenseCurrency } from '../../../support/splitting/change-expense-currency-command.js';

When('owner 將原支出改為 JPY 200', async ({ world }) => {
  await changeOriginalExpenseCurrency(world);
});
