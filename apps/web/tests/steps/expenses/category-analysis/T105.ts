import { Then } from '../../../support/fixtures.js';
import { assertAnalysisAccessBoundary } from '../../../support/category-analysis/state-assertions.js';

Then('分類分析顯示 {string} 且不洩漏原旅行圖表、分類或金額', async ({ page, world }, state) => {
  await assertAnalysisAccessBoundary(page, world, state);
});
