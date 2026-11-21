import { Then } from '../../../support/fixtures.js';
import { assertAnalysisReadOnly } from '../../../support/category-analysis/oracle.js';

Then('分類分析查詢前後的來源帳務完全相同', async ({ world }) => {
  assertAnalysisReadOnly(world);
});
