import { Given } from '../../../support/fixtures.js';
import { openBrowserCategoryInfo } from '../../../support/category-analysis/page.js';

Given('分類分析的 {string} 分類 {string} 資訊卡已開啟', async ({ page, world }, kind, category) => {
  await openBrowserCategoryInfo(page, world, kind, category);
});
