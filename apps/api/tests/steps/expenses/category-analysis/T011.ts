import { Given } from '../../../support/fixtures.js';
import { seedPagedAnalysis } from '../../../support/category-analysis/fixture.js';

Given(
  '分類分析旅行有 {int} 筆各 {string} {word} 的單人餐飲及旅行前 {string} {word} 的機票',
  async ({ world }, count, currency, meal, ticketCurrency, ticket) => {
    await seedPagedAnalysis(world, count, currency, meal, ticketCurrency, ticket);
  },
);
