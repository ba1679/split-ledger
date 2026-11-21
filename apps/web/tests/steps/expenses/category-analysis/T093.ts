import { Then } from '../../../support/fixtures.js';
import { assertAnalysisSameColor } from '../../../support/category-analysis/assertions.js';

Then('分類分析兩圖的 {string} 配色相同', async ({ page, world }, category) => {
  await assertAnalysisSameColor(page, world, category);
});
