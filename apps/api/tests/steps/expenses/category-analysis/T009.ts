import { Given } from '../../../support/fixtures.js';
import { appendAnalysisRows } from '../../../support/category-analysis/fixture.js';

Given('分類分析旅行已新增以下支出：', async ({ world }, table) => {
  await appendAnalysisRows(world, table.hashes());
});
