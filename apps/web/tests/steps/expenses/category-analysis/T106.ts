import { Then } from '../../../support/fixtures.js';
import { assertReturnedAnalysisLedger } from '../../../support/category-analysis/assertions.js';

Then('分類分析返回目前旅行帳本並顯示個人花費與應收應付摘要', async ({ page, world }) => {
  await assertReturnedAnalysisLedger(page, world);
});
