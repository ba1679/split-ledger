import { Given } from '../../../support/fixtures.js';
import { seedEmptyAnalysis } from '../../../../../api/tests/support/category-analysis/fixture.js';
import { openAnalysisLedger } from '../../../support/category-analysis/arrange.js';

Given('分類分析旅行尚無支出', async ({ page, world, analysisViewport }) => {
  await seedEmptyAnalysis(world);
  await openAnalysisLedger(page, world, analysisViewport);
});
