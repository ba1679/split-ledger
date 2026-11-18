import { Given } from '../../../support/fixtures.js';
import { arrangeRejectedExpenseSave } from '../../../support/loading/expense-save-draft.js';

Given('支出編輯草稿已修改且本次保存將明確失敗', async ({ page, world }) => {
  await arrangeRejectedExpenseSave(page, world);
});
