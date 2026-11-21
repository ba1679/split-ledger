import { Then } from '../../../support/fixtures.js';
import { assertReturnedAnalysisLedger } from '../../../support/category-analysis/assertions.js';

Then('分類分析返回目前旅行帳本且原有總額與成員結餘位置保留', async ({ page, world }) => {
  await assertReturnedAnalysisLedger(page, world);
});
