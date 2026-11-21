import { Given } from '../../../support/fixtures.js';
import { seedPagedAnalysis } from '../../../../../api/tests/support/category-analysis/fixture.js';
import { openAnalysisLedger } from '../../../support/category-analysis/arrange.js';

Given(
  '分類分析旅行有 {int} 筆各 {string} {word} 的單人餐飲及旅行前 {string} {word} 的機票',
  async ({ page, world, analysisViewport }, count, currency, meal, ticketCurrency, ticket) => {
    await seedPagedAnalysis(world, count, currency, meal, ticketCurrency, ticket);
    await openAnalysisLedger(page, world, analysisViewport);
  },
);
