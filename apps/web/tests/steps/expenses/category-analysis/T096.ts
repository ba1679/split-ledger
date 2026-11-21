import { Then } from '../../../support/fixtures.js';
import { assertSmallAnalysisCategory } from '../../../support/category-analysis/assertions.js';

Then(
  '分類分析的 {string} 分類 {string} 金額為 {string} 且占比顯示 {string}',
  async ({ page, world }, kind, category, amount, percent) => {
    await assertSmallAnalysisCategory(page, world, kind, category, amount, percent);
  },
);
