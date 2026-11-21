import { Given } from '../../../support/fixtures.js';
import { seedAnalysisRows } from '../../../support/category-analysis/fixture.js';

Given('分類分析旅行已有以下支出：', async ({ world }, table) => {
  await seedAnalysisRows(world, table.hashes());
});
