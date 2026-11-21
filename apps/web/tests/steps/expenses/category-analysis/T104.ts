import { Then } from '../../../support/fixtures.js';
import { assertTainanAnalysisPending } from '../../../support/category-analysis/state-assertions.js';

Then('台南分類分析讀取中不顯示日本旅行的分類或金額', async ({ page, world }) => {
  await assertTainanAnalysisPending(page, world);
});
