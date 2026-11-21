import { When } from '../../../support/fixtures.js';
import { keyboardAnalysisCurrency } from '../../../support/category-analysis/actions.js';

When('以鍵盤在分類分析選擇幣別 {string}', async ({ page, world }, currency) => {
  await keyboardAnalysisCurrency(page, world, currency);
});
