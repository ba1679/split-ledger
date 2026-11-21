import { When } from '../../../support/fixtures.js';
import { leaveBrowserAnalysisHover } from '../../../support/category-analysis/actions.js';

When('將滑鼠移離分類分析的餐飲區域', async ({ page, world }) => {
  await leaveBrowserAnalysisHover(page, world);
});
