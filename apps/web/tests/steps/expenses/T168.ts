import { Given } from '../../support/fixtures.js';
import { draft } from '../../support/expense-helpers.js';

Given('使用者在新增支出表單選擇 USD 且金額為 12.50', async ({ page, world }) => {
  await draft(page, world, '飲料', '12.50', 'USD');
});
