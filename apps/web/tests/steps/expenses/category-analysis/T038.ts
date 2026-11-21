import { Given } from '../../../support/fixtures.js';
import { appendBrowserAnalysis } from '../../../support/category-analysis/mutations.js';

Given('分類分析旅行已新增以下支出：', async ({ page, world }, table) => {
  await appendBrowserAnalysis(page, world, table.hashes());
});
