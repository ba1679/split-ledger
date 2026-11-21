import { When } from '../../../support/fixtures.js';
import { returnBrowserAnalysisLedger } from '../../../support/category-analysis/actions.js';

When('從分類分析返回帳本', async ({ page, world }) => {
  await returnBrowserAnalysisLedger(page, world);
});
