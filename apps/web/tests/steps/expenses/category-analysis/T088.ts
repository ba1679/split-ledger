import { Then } from '../../../support/fixtures.js';
import { assertSelectedAnalysisCurrency } from '../../../support/category-analysis/assertions.js';

Then(
  '分類分析目前幣別為 {string} 且選項依序為 {string}',
  async ({ page, world }, currency, list) => {
    await assertSelectedAnalysisCurrency(page, world, currency, list);
  },
);
