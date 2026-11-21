import { Given } from '../../../support/fixtures.js';
import { setAnalysisDevice } from '../../../support/category-analysis/arrange.js';

Given('分類分析使用裝置為 {string}', async ({ page, world }, device) => {
  await setAnalysisDevice(page, world, device);
});
