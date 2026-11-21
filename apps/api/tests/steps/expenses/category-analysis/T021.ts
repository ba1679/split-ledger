import { Given } from '../../../support/fixtures.js';
import { setAnalysisViewer } from '../../../support/category-analysis/access.js';

Given('分類分析查看者為 {string}', async ({ world }, viewer) => {
  await setAnalysisViewer(world, viewer);
});
