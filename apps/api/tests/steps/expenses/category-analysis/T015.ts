import { Given } from '../../../support/fixtures.js';
import { saveAnalysisShares } from '../../../support/category-analysis/mutations.js';

Given('分類分析支出 {string} 已保存分攤者為 {string}', async ({ world }, item, names) => {
  await saveAnalysisShares(world, item, names);
});
