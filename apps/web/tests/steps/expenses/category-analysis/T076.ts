import { When } from '../../../support/fixtures.js';
import { switchPendingTainanAnalysis } from '../../../support/category-analysis/actions.js';

When('切換至台南旅行分類分析', async ({ page, world }) => {
  await switchPendingTainanAnalysis(page, world);
});
