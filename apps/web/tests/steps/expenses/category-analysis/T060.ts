import { Given } from '../../../support/fixtures.js';
import { controlNextAnalysis } from '../../../support/category-analysis/response.js';

Given('分類分析下一次讀取為 {string}', async ({ world }, mode) => {
  controlNextAnalysis(world, mode);
});
