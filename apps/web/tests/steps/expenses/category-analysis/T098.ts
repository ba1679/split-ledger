import { Then } from '../../../support/fixtures.js';
import { assertInitialAnalysisPending } from '../../../support/category-analysis/state-assertions.js';

Then('分類分析顯示初次讀取狀態且沒有已確認的零總額', async ({ page, world }) => {
  await assertInitialAnalysisPending(page, world);
});
