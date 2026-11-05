import { Given } from '../../support/fixtures.js';
import { draft } from '../../support/expense-helpers.js';

Given("使用者在新增支出表單選擇 JPY 且金額為 100", async ({ page, world }) => {
 await draft(page, world, '午餐', '100', 'JPY');
});
