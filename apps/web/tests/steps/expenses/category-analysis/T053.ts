import { Given } from '../../../support/fixtures.js';
import { confirmPreviousBrowserAnalysis } from '../../../support/category-analysis/page.js';

Given('分類分析先前內容已確認', async ({ page, world }) => {
  await confirmPreviousBrowserAnalysis(page, world);
});
