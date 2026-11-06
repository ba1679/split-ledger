import { Given } from '../../support/fixtures.js';
import { seedLedger, assertTotal } from '../../support/expense-helpers.js';

Given('"日本旅行" 的 JPY 總額為 17000 且餐費為 JPY 2000', async ({ page, world }) => {
  await seedLedger(page, world, '2000', false);
  await assertTotal(page, world, 'JPY', '17000');
});
