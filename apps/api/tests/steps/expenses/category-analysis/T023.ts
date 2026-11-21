import { When } from '../../../support/fixtures.js';
import { readAnalysis } from '../../../support/category-analysis/read.js';

When('目前查看者讀取分類分析', async ({ world }) => {
  await readAnalysis(world, world.get<string | null>('analysis:viewer'));
});
