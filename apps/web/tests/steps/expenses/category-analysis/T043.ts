import { Given } from '../../../support/fixtures.js';
import { saveBrowserAnalysisAmount } from '../../../support/category-analysis/mutations.js';

Given(
  '分類分析支出 {string} 已保存金額為 {string} {word}',
  async ({ page, world }, item, currency, amount) => {
    await saveBrowserAnalysisAmount(page, world, item, currency, amount);
  },
);
