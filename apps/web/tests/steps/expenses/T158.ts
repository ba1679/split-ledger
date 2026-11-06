import { Given } from '../../support/fixtures.js';
import { seedLedger, assertTotal } from '../../support/expense-helpers.js';

Given('"日本旅行" 有 JPY 15000 住宿且 JPY 總額為 25500', async ({ page, world }) => {
  await seedLedger(page, world, '10500', false);
  await assertTotal(page, world, 'JPY', '25500');
});
