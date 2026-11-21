import { Given } from '../../../support/fixtures.js';
import { loadAnalysisLedgerCount } from '../../../support/category-analysis/arrange.js';

Given('分類分析旅行的支出清單已載入 {int} 筆', async ({ page, world }, count) => {
  await loadAnalysisLedgerCount(page, world, count);
});
