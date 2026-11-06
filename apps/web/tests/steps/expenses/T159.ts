import { Given } from '../../support/fixtures.js';
import { seedLedger, assertTotal } from '../../support/expense-helpers.js';

Given('"日本旅行" 有 TWD 8000 機票且 JPY 總額為 17500', async ({ page, world }) => {
  await seedLedger(page, world, '2500');
  await assertTotal(page, world, 'JPY', '17500');
});
