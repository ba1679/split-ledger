import { Given } from '../../../support/fixtures.js';
import { setAnalysisLifecycle } from '../../../support/category-analysis/access.js';

Given('分類分析旅行狀態為 {string}', async ({ world }, state) => {
  await setAnalysisLifecycle(world, state);
});
