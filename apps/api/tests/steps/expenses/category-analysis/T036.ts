import { Then } from '../../../support/fixtures.js';
import { assertAnalysisDenied } from '../../../support/category-analysis/oracle.js';

Then('分類分析讀取被拒絕為 {string}', async ({ world }, reason) => {
  assertAnalysisDenied(world, reason);
});
