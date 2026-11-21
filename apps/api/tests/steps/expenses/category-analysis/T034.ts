import { Then } from '../../../support/fixtures.js';
import { assertAnalysisOwner } from '../../../support/category-analysis/oracle.js';

Then('分類分析的個人對象為 Alice 的擁有者成員', async ({ world }) => {
  assertAnalysisOwner(world);
});
