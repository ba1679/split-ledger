import { Then, expect } from '../../../support/fixtures.js';
import { assertPersistentAnalysisDetails } from '../../../support/category-analysis/assertions.js';

Then('分類分析的滑鼠提示已關閉', async ({ page, world }) => {
  await expect(page.getByRole('tooltip', { name: '分類資訊', exact: true })).toBeHidden();
  await assertPersistentAnalysisDetails(page, world);
});
