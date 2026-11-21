import { Given } from '../../../support/fixtures.js';
import { seedEmptyAnalysis } from '../../../support/category-analysis/fixture.js';

Given('分類分析旅行尚無支出', async ({ world }) => {
  await seedEmptyAnalysis(world);
});
