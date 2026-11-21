import { Then } from '../../../support/fixtures.js';
import { assertZeroAnalysisChart } from '../../../support/category-analysis/assertions.js';

Then(
  '分類分析的 {string} 顯示 {string} 零值且沒有消費扇形或占比',
  async ({ page, world }, kind, currency) => {
    await assertZeroAnalysisChart(page, world, kind, currency);
  },
);
