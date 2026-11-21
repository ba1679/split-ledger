import { Given } from '../../../support/fixtures.js';
import { setBrowserAnalysisOffline } from '../../../support/category-analysis/states.js';

Given('分類分析裝置已離線', async ({ page, world }) => {
  await setBrowserAnalysisOffline(page, world);
});
