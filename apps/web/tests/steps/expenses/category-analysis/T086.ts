import { Then } from '../../../support/fixtures.js';
import { assertAnalysisGeometry } from '../../../support/category-analysis/assertions.js';

Then('分類分析扇形與各圖精確分類比例一致', async ({ page, world }) => {
  await assertAnalysisGeometry(page, world);
});
