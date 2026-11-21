import { Given } from '../../../support/fixtures.js';
import { arrangeLongAnalysisRows } from '../../../support/category-analysis/arrange.js';

Given(
  '分類分析旅行有多個分類及超長分類名稱的已保存支出',
  async ({ page, world, analysisViewport }) => {
    await arrangeLongAnalysisRows(page, world, analysisViewport);
  },
);
