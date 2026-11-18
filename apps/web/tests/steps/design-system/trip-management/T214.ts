import { When } from '../../../support/fixtures.js';
import { saveExpenseDraft } from '../../../support/loading/save-expense.js';

When('owner 保存目前支出編輯草稿', async ({ world }) => {
  await saveExpenseDraft(world);
});
