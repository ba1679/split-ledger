import { Given } from '../../support/fixtures.js';
import { draft } from '../../support/expense-helpers.js';

Given("使用者已填妥飲料支出且金額為 USD 12.50", async ({ page, world }) => {
 await draft(page, world, '飲料', '12.50', 'USD');
});
