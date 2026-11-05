import { Given } from '../../support/fixtures.js';
import { seedLedger, assertTotal } from '../../support/expense-helpers.js';

Given("\"日本旅行\" 已有 TWD 8000、JPY 15000 與 JPY 2000 支出", async ({ page, world }) => {
 await seedLedger(page, world, '2000'); await assertTotal(page, world, 'TWD', '8000'); await assertTotal(page, world, 'JPY', '17000');
});
