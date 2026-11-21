import { Given } from '../../../support/fixtures.js';
import { clearAnalysisCategory } from '../../../support/category-analysis/mutations.js';

Given('分類分析支出 {string} 已清除分類', async ({ world }, item) => {
  await clearAnalysisCategory(world, item);
});
