import { Given } from '../../../support/fixtures.js';
import { seedExpenseAfterArrangement } from '../../../support/splitting/stale-arrangement-fixture.js';

Given('舊付款安排取得後帳本已有新的支出', async ({ world }) => {
  await seedExpenseAfterArrangement(world);
});
