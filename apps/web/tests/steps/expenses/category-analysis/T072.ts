import { When } from '../../../support/fixtures.js';
import { inspectBrowserCategory } from '../../../support/category-analysis/actions.js';

When(
  '以 {string} 查看分類分析的 {string} 分類 {string}',
  async ({ page, world, analysisVariant }, operation, kind, category) => {
    await inspectBrowserCategory(page, world, operation, kind, category, analysisVariant);
  },
);
