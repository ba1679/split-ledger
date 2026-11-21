import { Given } from '../../../support/fixtures.js';
import { seedAnalysisPayments } from '../../../../../api/tests/support/category-analysis/fixture.js';

Given(
  '分類分析旅行已有 Amy 還款 {string} {word} 及 Bob 實付結清 {string} {word}',
  async ({ world }, rc, r, pc, p) => {
    await seedAnalysisPayments(world, rc, r, pc, p);
  },
);
