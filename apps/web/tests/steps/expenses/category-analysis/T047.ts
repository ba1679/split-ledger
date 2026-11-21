import { Given } from '../../../support/fixtures.js';
import { clearBrowserAnalysisCategory } from '../../../support/category-analysis/mutations.js';

Given('分類分析支出 {string} 已清除分類', async ({ page, world }, item) => {
  await clearBrowserAnalysisCategory(page, world, item);
});
