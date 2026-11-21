import { Given } from '../../../support/fixtures.js';
import { arrangePendingJapanAnalysis } from '../../../support/category-analysis/races.js';

Given('日本分類分析正在延遲讀取', async ({ page, world, analysisViewport }) => {
  await arrangePendingJapanAnalysis(page, world, analysisViewport);
});
