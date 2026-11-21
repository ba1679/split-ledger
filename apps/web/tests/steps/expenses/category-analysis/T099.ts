import { Then } from '../../../support/fixtures.js';
import { assertInitialAnalysisFailure } from '../../../support/category-analysis/state-assertions.js';

Then('分類分析顯示初讀失敗及重試，不冒充沒有支出', async ({ page, world }) => {
  await assertInitialAnalysisFailure(page, world);
});
