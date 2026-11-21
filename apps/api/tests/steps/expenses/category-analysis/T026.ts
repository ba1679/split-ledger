import { Then } from '../../../support/fixtures.js';
import { assertAnalysisCurrencies } from '../../../support/category-analysis/oracle.js';

Then('分類分析回傳的幣別依序為 {string}', async ({ world }, list) => {
  assertAnalysisCurrencies(world, list);
});
