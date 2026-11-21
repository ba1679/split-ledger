import { Then } from '../../../support/fixtures.js';
import { assertAnalysisTotals } from '../../../support/category-analysis/oracle.js';

Then('分類分析回傳的完整總額如下：', async ({ world }, table) => {
  assertAnalysisTotals(world, table.hashes());
});
