import { Then } from '../../../support/fixtures.js';
import { assertFullAnalysisRing } from '../../../support/category-analysis/assertions.js';

Then('分類分析的 {string} 為代表唯一分類的完整圓環', async ({ page, world }, kind) => {
  await assertFullAnalysisRing(page, world, kind);
});
