import { Then } from '../../../support/fixtures.js';
import { assertAnalysisInfo } from '../../../support/category-analysis/assertions.js';

Then(
  '分類分析資訊卡顯示 {string}、{string}、{string} 與 {string}',
  async ({ page, world }, category, currency, amount, percent) => {
    await assertAnalysisInfo(page, world, category, currency, amount, percent);
  },
);
