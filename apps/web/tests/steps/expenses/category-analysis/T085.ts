import { Then } from '../../../support/fixtures.js';
import { assertBrowserTotal } from '../../../support/category-analysis/assertions.js';

Then(
  '分類分析頁在 {string} 的個人總額為 {string}、團體總額為 {string}',
  async ({ page, world }, currency, personal, group) => {
    await assertBrowserTotal(page, world, '個人', currency, personal);
    await assertBrowserTotal(page, world, '團體', currency, group);
  },
);
