import { Then } from '../../../support/fixtures.js';
import { assertAnalysisLayout } from '../../../support/category-analysis/assertions.js';

Then('分類分析兩圖在桌機並排、手機依個人再團體排列', async ({ page, world }) => {
  await assertAnalysisLayout(page, world);
});
