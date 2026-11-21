import { Given } from '../../../support/fixtures.js';
import { arrangeAnalysisFailure } from '../../../support/category-analysis/states.js';

Given('分類分析頁已處於 {string}', async ({ page, world }, state) => {
  await arrangeAnalysisFailure(page, world, state);
});
