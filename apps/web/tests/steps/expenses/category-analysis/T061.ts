import { Given } from '../../../support/fixtures.js';
import { arrangeConfirmedAnalysisMeal } from '../../../support/category-analysis/states.js';

Given(
  '分類分析已有餐飲個人 {string} {word}、團體 {string} {word} 的已確認內容',
  async ({ page, world, analysisViewport }, currency, personal, groupCurrency, group) => {
    await arrangeConfirmedAnalysisMeal(
      page,
      world,
      currency,
      personal,
      groupCurrency,
      group,
      analysisViewport,
    );
  },
);
