import { When } from '../../../support/fixtures.js';
import { readMigratedFlightExpense } from '../../../support/splitting/read-migrated-expense-command.js';

When('owner 讀取遷移後的機票支出', async ({ world }) => {
  await readMigratedFlightExpense(world);
});
