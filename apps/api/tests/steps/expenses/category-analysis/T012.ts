import { Given } from '../../../support/fixtures.js';
import { seedOtherAnalysisTrip } from '../../../support/category-analysis/fixture.js';

Given('另一分類分析旅行有 {string} {word} 的單人餐飲', async ({ world }, currency, amount) => {
  await seedOtherAnalysisTrip(world, currency, amount);
});
