import { Then } from '../../../support/fixtures.js';
import { assertAnalysisUpdating } from '../../../support/category-analysis/state-assertions.js';

Then(
  '分類分析保留個人 {string} {word}、團體 {string} {word} 的圖表明細並顯示更新中',
  async ({ page, world }, currency, personal, groupCurrency, group) => {
    await assertAnalysisUpdating(page, world, currency, personal, groupCurrency, group);
  },
);
