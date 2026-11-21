import { When } from '../../../support/fixtures.js';
import { selectBrowserAnalysisCurrency } from '../../../support/category-analysis/page.js';

When('在分類分析選擇幣別 {string}', async ({ page, world }, currency) => {
  await selectBrowserAnalysisCurrency(page, world, currency);
});
