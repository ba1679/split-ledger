import { Given } from '../../../support/fixtures.js';
import { arrangeAnalysisRows } from '../../../support/category-analysis/arrange.js';

Given('分類分析旅行已有以下支出：', async ({ page, world, analysisViewport }, table) => {
  await arrangeAnalysisRows(page, world, table.hashes(), analysisViewport);
});
