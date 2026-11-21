import { Then } from '../../../support/fixtures.js';
import { assertEmptyAnalysisSuccess } from '../../../support/category-analysis/state-assertions.js';

Then('分類分析顯示旅行尚無支出且沒有幣別選擇或消費扇形', async ({ page, world }) => {
  await assertEmptyAnalysisSuccess(page, world);
});
