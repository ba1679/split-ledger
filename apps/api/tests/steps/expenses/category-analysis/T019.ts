import { Given } from '../../../support/fixtures.js';
import { disableAnalysisMember } from '../../../support/category-analysis/mutations.js';

Given('分類分析成員 {string} 已改名為 {string} 並停用', async ({ world }, oldName, newName) => {
  await disableAnalysisMember(world, oldName, newName);
});
