import { Then } from '../../../support/fixtures.js';
import { assertAnalysisUpdateFailure } from '../../../support/category-analysis/state-assertions.js';

Then(
  '分類分析保留個人 {string} {word}、團體 {string} {word} 的圖表明細並顯示更新失敗可重試',
  async ({ page, world }, currency, personal, groupCurrency, group) => {
    await assertAnalysisUpdateFailure(page, world, currency, personal, groupCurrency, group);
  },
);
