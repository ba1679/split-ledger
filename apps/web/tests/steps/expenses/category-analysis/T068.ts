import { Given } from '../../../support/fixtures.js';
import { arrangeTainanWithPendingJapan } from '../../../support/category-analysis/races.js';

Given('目前已顯示台南分類分析且日本舊讀取仍在等待', async ({ page, world, analysisViewport }) => {
  await arrangeTainanWithPendingJapan(page, world, analysisViewport);
});
