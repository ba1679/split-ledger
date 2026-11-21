import { When } from '../../../support/fixtures.js';
import { closeBrowserCategoryInfo } from '../../../support/category-analysis/actions.js';

When('以 {string} 關閉分類分析資訊卡', async ({ page, world }, operation) => {
  await closeBrowserCategoryInfo(page, world, operation);
});
