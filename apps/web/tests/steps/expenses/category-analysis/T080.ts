import { Then } from '../../../support/fixtures.js';
import { assertBrowserTotal } from '../../../support/category-analysis/assertions.js';

Then(
  '分類分析的 {string} 在 {string} 顯示總額 {string}',
  async ({ page, world }, kind, currency, total) => {
    await assertBrowserTotal(page, world, kind, currency, total);
  },
);
