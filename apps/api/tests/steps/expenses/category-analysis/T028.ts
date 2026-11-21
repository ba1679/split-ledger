import { Then } from '../../../support/fixtures.js';
import { assertAnalysisShared } from '../../../support/category-analysis/oracle.js';

Then('分類分析回傳共同消費狀態為 {string}', async ({ world }, state) => {
  assertAnalysisShared(world, state);
});
