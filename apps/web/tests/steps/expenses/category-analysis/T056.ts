import { Given } from '../../../support/fixtures.js';
import {
  openConfirmedBrowserAnalysis,
  selectBrowserAnalysisCurrency,
} from '../../../support/category-analysis/page.js';

Given('分類分析頁已先查看 {string} 再選擇 {string}', async ({ page, world }, previous, current) => {
  await openConfirmedBrowserAnalysis(page, world);
  await selectBrowserAnalysisCurrency(page, world, previous);
  world.set('analysis:previousCurrencyUI', world.get('analysis:selectedUI'));
  await selectBrowserAnalysisCurrency(page, world, current);
});
