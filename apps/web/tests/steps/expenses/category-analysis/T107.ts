import { Given } from '../../../support/fixtures.js';
import { inspectBrowserCategory } from '../../../support/category-analysis/actions.js';

Given('分類分析個人餐飲的滑鼠提示已顯示', async ({ page, world }) => {
  await inspectBrowserCategory(page, world, '滑鼠移入', '個人', '餐飲');
});
