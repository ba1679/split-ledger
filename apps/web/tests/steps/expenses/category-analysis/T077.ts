import { When } from '../../../support/fixtures.js';
import { finishLateJapanAnalysis } from '../../../support/category-analysis/actions.js';

When('日本旅行較晚的分類分析讀取完成', async ({ page, world }) => {
  await finishLateJapanAnalysis(page, world);
});
