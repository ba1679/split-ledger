import { Given } from '../../../support/fixtures.js';
import { seedOriginalSettledExpense } from '../../../support/splitting/settled-expense-fixture.js';

Given('原支出已以 Amy 實付 JPY 33 結清', async ({ world }) => {
  await seedOriginalSettledExpense(world);
});
