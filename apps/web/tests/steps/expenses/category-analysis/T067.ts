import { Given } from '../../../support/fixtures.js';
import { arrangePendingTainanAnalysis } from '../../../support/category-analysis/races.js';

Given('台南分類分析下一次讀取尚未完成', async ({ world }) => {
  await arrangePendingTainanAnalysis(world);
});
