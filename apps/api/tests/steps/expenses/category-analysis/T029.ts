import { Then } from '../../../support/fixtures.js';
import { assertAnalysisEmpty } from '../../../support/category-analysis/oracle.js';

Then('分類分析成功且沒有任何支出幣別', async ({ world }) => {
  assertAnalysisEmpty(world);
});
