import { When } from '../../../support/fixtures.js';
import { retryBrowserAnalysis } from '../../../support/category-analysis/actions.js';

When('重試分類分析讀取', async ({ page, world }) => {
  await retryBrowserAnalysis(page, world);
});
