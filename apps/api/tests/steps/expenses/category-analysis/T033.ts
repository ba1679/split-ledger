import { Given } from '../../../support/fixtures.js';
import { seedSameNameAnalysisAccount } from '../../../support/category-analysis/access.js';

Given('分類分析另有與同行者 {string} 同名的獨立帳號', async ({ world }, name) => {
  await seedSameNameAnalysisAccount(world, name);
});
