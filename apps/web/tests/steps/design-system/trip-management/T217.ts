import { Then } from '../../../support/fixtures.js';
import { assertExpenseSaveResult } from '../../../support/loading/expense-save-result.js';

Then('原支出恰更新一次且呈現已確認結果', async ({ world }) => {
  await assertExpenseSaveResult(world);
});
