import { Given } from '../../../support/fixtures.js';
import { saveBrowserAnalysisShares } from '../../../support/category-analysis/mutations.js';

Given('分類分析支出 {string} 已保存分攤者為 {string}', async ({ page, world }, item, names) => {
  await saveBrowserAnalysisShares(page, world, item, names);
});
