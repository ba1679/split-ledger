import { Given } from '../../../support/fixtures.js';
import { renameBrowserAnalysisCategory } from '../../../support/category-analysis/mutations.js';

Given('分類分析的分類 {string} 已改名為 {string}', async ({ page, world }, oldName, newName) => {
  await renameBrowserAnalysisCategory(page, world, oldName, newName);
});
