import { Given } from '../../../support/fixtures.js';
import { renameAnalysisCategory } from '../../../support/category-analysis/mutations.js';

Given('分類分析的分類 {string} 已改名為 {string}', async ({ world }, oldName, newName) => {
  await renameAnalysisCategory(world, oldName, newName);
});
