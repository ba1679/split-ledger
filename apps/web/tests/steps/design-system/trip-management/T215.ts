import { Then } from '../../../support/fixtures.js';
import { assertExpenseSaveFailed } from '../../../support/loading/expense-save-failed.js';

Then('保存等待結束且原帳務與修改草稿均保留', async ({ world }) => {
  await assertExpenseSaveFailed(world);
});
