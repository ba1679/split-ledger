import { Given } from '../../../support/fixtures.js';
import { deleteBrowserAnalysisExpense } from '../../../support/category-analysis/mutations.js';

Given('分類分析支出 {string} 已刪除', async ({ page, world }, item) => {
  await deleteBrowserAnalysisExpense(page, world, item);
});
