import { Given } from '../../../support/fixtures.js';
import { disableBrowserAnalysisMember } from '../../../support/category-analysis/mutations.js';

Given(
  '分類分析成員 {string} 已改名為 {string} 並停用',
  async ({ page, world }, oldName, newName) => {
    await disableBrowserAnalysisMember(page, world, oldName, newName);
  },
);
