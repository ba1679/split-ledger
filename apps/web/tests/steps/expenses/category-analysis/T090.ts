import { Then } from '../../../support/fixtures.js';
import { assertNoSharedAnalysis } from '../../../support/category-analysis/assertions.js';

Then('分類分析團體區塊顯示全旅行沒有共同消費的說明', async ({ page, world }) => {
  await assertNoSharedAnalysis(page, world);
});
