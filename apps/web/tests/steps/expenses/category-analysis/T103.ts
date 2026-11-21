import { Then } from '../../../support/fixtures.js';
import { assertAnalysisOffline } from '../../../support/category-analysis/state-assertions.js';

Then('分類分析保留舊內容、可辨識離線且更新動畫停止', async ({ page, world }) => {
  await assertAnalysisOffline(page, world);
});
