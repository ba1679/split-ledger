import { Then } from '../../../support/fixtures.js';
import { assertAnalysisRoute } from '../../../support/category-analysis/assertions.js';

Then('分類分析頁屬於目前旅行且可返回原帳本', async ({ page, world }) => {
  await assertAnalysisRoute(page, world);
});
