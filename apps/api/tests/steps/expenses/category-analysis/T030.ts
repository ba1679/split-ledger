import { Given } from '../../../support/fixtures.js';
import { seedHistoricalAnalysis } from '../../../support/category-analysis/fixture.js';

Given(
  '分類分析旅行有歷史精度 {int} 的 {string} {word} 及精度 {int} 的 {string} {word}，皆由 Alice 與 Amy 分攤',
  async ({ world }, oldUnit, currency, oldAmount, newUnit, newCurrency, newAmount) => {
    await seedHistoricalAnalysis(
      world,
      oldUnit,
      currency,
      oldAmount,
      newUnit,
      newCurrency,
      newAmount,
    );
  },
);
