import { Given } from '../../../support/fixtures.js';
import { seedDualAnalysisTrips } from '../../../support/category-analysis/races.js';

Given(
  '分類分析有日本餐飲 {string} {word} 及台南交通 {string} {word} 的兩趟單人旅行',
  async ({ world }, jc, ja, tc, ta) => {
    await seedDualAnalysisTrips(world, jc, ja, tc, ta);
  },
);
