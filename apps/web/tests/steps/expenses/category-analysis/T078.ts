import { When } from '../../../support/fixtures.js';
import { openOriginalAnalysisLink } from '../../../support/category-analysis/actions.js';

When('開啟原旅行的分類分析連結', async ({ page, world }) => {
  await openOriginalAnalysisLink(page, world);
});
