import { Then } from '../../../support/fixtures.js';
import { assertAnalysisInfoClosed } from '../../../support/category-analysis/assertions.js';

Then('分類分析資訊卡關閉且焦點回到原分類控制', async ({ page, world }) => {
  await assertAnalysisInfoClosed(page, world);
});
