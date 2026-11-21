import { Then } from '../../../support/fixtures.js';
import { assertLongAnalysisContent } from '../../../support/category-analysis/assertions.js';

Then('分類分析所有分類名稱與金額完整可讀且不自動合併為其他', async ({ page, world }) => {
  await assertLongAnalysisContent(page, world);
});
