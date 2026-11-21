import { Given } from '../../../support/fixtures.js';
import { deleteAnalysisExpense } from '../../../support/category-analysis/mutations.js';

Given('分類分析支出 {string} 已刪除', async ({ world }, item) => {
  await deleteAnalysisExpense(world, item);
});
