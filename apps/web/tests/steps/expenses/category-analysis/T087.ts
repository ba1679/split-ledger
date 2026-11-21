import { Then } from '../../../support/fixtures.js';
import { assertSharedAnalysisExplanation } from '../../../support/category-analysis/assertions.js';

Then('分類分析團體區塊說明只計至少兩人分攤的共同消費', async ({ page, world }) => {
  await assertSharedAnalysisExplanation(page, world);
});
