import { Then } from '../../../support/fixtures.js';
import { assertMobileAnalysisEntry } from '../../../support/category-analysis/assertions.js';

Then('手機帳本的個人花費摘要提供分析入口且記一筆獨立於三項底部導覽', async ({ page, world }) => {
  await assertMobileAnalysisEntry(page, world);
});
