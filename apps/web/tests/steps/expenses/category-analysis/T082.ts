import { Then } from '../../../support/fixtures.js';
import { assertMobileAnalysisEntry } from '../../../support/category-analysis/assertions.js';

Then('手機帳本的分析入口位於旅行導覽下一列且底部導覽維持五項', async ({ page, world }) => {
  await assertMobileAnalysisEntry(page, world);
});
