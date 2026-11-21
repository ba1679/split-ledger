import { Then } from '../../../support/fixtures.js';
import { assertAnalysisCategories } from '../../../support/category-analysis/oracle.js';

Then(
  '分類分析回傳 {string} 在 {string} 的完整分類金額：',
  async ({ world }, kind, currency, table) => {
    assertAnalysisCategories(world, kind, currency, table.hashes());
  },
);
