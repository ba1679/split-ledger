import { When } from '../../../support/fixtures.js';
import { saveRecoveredExpense } from '../../../support/loading/save-recovered-expense.js';

When('owner 保存選項恢復後的支出', async ({ world }) => {
  await saveRecoveredExpense(world);
});
