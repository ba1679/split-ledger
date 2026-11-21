import { Given } from '../../../support/fixtures.js';
import { retainBrowserAnalysisCurrency } from '../../../support/category-analysis/page.js';

Given('分類分析保留選擇為 {string}', async ({ page, world }, currency) => {
  await retainBrowserAnalysisCurrency(page, world, currency);
});
