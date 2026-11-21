import { Then } from '../../../support/fixtures.js';
import { assertPersistentAnalysisDetails } from '../../../support/category-analysis/assertions.js';

Then('分類分析常駐明細不依賴顏色或動畫才能閱讀', async ({ page, world }) => {
  await assertPersistentAnalysisDetails(page, world);
});
