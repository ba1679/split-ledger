import { Given } from '../../../support/fixtures.js';
import {
  openConfirmedBrowserAnalysis,
  selectBrowserAnalysisCurrency,
} from '../../../support/category-analysis/page.js';

Given('分類分析頁已選擇 {string}', async ({ page, world }, currency) => {
  await openConfirmedBrowserAnalysis(page, world);
  await selectBrowserAnalysisCurrency(page, world, currency);
});
