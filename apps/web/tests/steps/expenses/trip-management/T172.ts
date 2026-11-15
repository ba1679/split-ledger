import { Given } from '../../../support/fixtures.js';
import { arrangeStaleExpenseDraft } from '../../../support/expenses/stale-draft.js';

Given('支出草稿未提交且另一裝置已將旅行移入垃圾桶', async ({ page, browser, world }) => {
  await arrangeStaleExpenseDraft(page, browser, world);
});
