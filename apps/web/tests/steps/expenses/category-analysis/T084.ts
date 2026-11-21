import { Then } from '../../../support/fixtures.js';
import { assertAnalysisDetails } from '../../../support/category-analysis/assertions.js';

Then(
  '分類分析頁的 {string} 在 {string} 顯示完整分類明細：',
  async ({ page, world }, kind, currency, table) => {
    await assertAnalysisDetails(page, world, kind, currency, table.hashes());
  },
);
