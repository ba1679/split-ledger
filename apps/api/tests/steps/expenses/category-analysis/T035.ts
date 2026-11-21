import { Then } from '../../../support/fixtures.js';
import { assertAnalysisHistoricalShares } from '../../../support/category-analysis/oracle.js';

Then('分類分析支出 {string} 仍保留原本三個成員的歷史分攤', async ({ world }, item) => {
  assertAnalysisHistoricalShares(world, item);
});
