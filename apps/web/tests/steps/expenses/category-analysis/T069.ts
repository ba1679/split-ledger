import { When } from '../../../support/fixtures.js';
import { openBrowserAnalysisFromLedger } from '../../../support/category-analysis/actions.js';

When('從帳本開啟分類分析', async ({ page, world }) => {
  await openBrowserAnalysisFromLedger(page, world);
});
