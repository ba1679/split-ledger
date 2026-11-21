import { Then } from '../../../support/fixtures.js';
import { assertAnalysisZero } from '../../../support/category-analysis/oracle.js';

Then('分類分析的 {string} 在 {string} 沒有分類且總額為零', async ({ world }, kind, currency) => {
  assertAnalysisZero(world, kind, currency);
});
