import { Given } from '../../support/fixtures.js';
import { draft } from '../../support/expense-helpers.js';

Given('使用者已填妥午餐支出且金額為 0', async ({ page, world }) => {
  await draft(page, world, '午餐', '0', 'JPY');
});
