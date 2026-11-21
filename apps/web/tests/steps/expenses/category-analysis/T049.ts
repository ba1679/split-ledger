import { Given } from '../../../support/fixtures.js';
import { setBrowserAnalysisLifecycle } from '../../../support/category-analysis/access.js';

Given('分類分析旅行狀態為 {string}', async ({ page, world }, state) => {
  await setBrowserAnalysisLifecycle(page, world, state);
});
