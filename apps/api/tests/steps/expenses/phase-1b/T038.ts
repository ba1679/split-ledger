import { When } from '../../../support/fixtures.js';
import { changeOriginalExpenseToEightHundred } from '../../../support/splitting/change-expense-to-eight-hundred-command.js';

When('owner 將原支出金額改為 JPY 800', async ({ world }) => {
  await changeOriginalExpenseToEightHundred(world);
});
