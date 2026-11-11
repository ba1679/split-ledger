import { When } from '../../../support/fixtures.js';
import { deleteOriginalPaidExpense } from '../../../support/splitting/delete-paid-expense-command.js';

When('owner 刪除已有還款的原支出', async ({ world }) => {
  await deleteOriginalPaidExpense(world);
});
