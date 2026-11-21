import { Given } from '../../../support/fixtures.js';
import { saveAnalysisAmount } from '../../../support/category-analysis/mutations.js';

Given(
  '分類分析支出 {string} 已保存金額為 {string} {word}',
  async ({ world }, item, currency, amount) => {
    await saveAnalysisAmount(world, item, currency, amount);
  },
);
