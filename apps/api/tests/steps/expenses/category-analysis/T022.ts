import { When } from '../../../support/fixtures.js';
import { readAnalysis } from '../../../support/category-analysis/read.js';

When('擁有者讀取分類分析', async ({ world }) => {
  await readAnalysis(world);
});
