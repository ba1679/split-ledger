import { Then } from '../../../support/fixtures.js';
import { assertAnalysisPrecision } from '../../../support/category-analysis/oracle.js';

Then('分類分析的 {string} 計算精度為 {int}', async ({ world }, currency, unit) => {
  assertAnalysisPrecision(world, currency, unit);
});
