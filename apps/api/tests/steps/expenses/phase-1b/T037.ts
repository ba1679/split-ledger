import { When } from '../../../support/fixtures.js';
import { reduceOriginalExpenseToThreeHundred } from '../../../support/splitting/reduce-expense-amount-command.js';

When('owner 將原支出金額改為 JPY 300', async ({ world }) => {
  await reduceOriginalExpenseToThreeHundred(world);
});
