import { Then } from '../../../support/fixtures.js';
import { assertAnalysisExactShares } from '../../../support/category-analysis/assertions.js';

Then('分類分析原始份額仍精確', async ({ page, world }) => {
  await assertAnalysisExactShares(page, world);
});
