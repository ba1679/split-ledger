import { When } from '../../../support/fixtures.js';
import { refocusAnalysisRead } from '../../../support/category-analysis/actions.js';

When('回到目前旅行的分類分析', async ({ page, world }) => {
  await refocusAnalysisRead(page, world);
});
