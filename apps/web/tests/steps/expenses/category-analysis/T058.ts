import { Given } from '../../../support/fixtures.js';
import { arrangeClosedBrowserInfo } from '../../../support/category-analysis/page.js';

Given('分類分析資訊卡已關閉且焦點在原分類控制', async ({ page, world }) => {
  await arrangeClosedBrowserInfo(page, world);
});
