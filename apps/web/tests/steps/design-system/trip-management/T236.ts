import { Then } from '../../../support/fixtures.js';
import { assertRecoveredExpense } from '../../../support/loading/recovered-expense-result.js';

Then('選項等待結束且支出正常保存', async ({ world }) => {
  await assertRecoveredExpense(world);
});
