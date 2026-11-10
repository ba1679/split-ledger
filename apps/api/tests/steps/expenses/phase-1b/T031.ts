import { When } from '../../../support/fixtures.js';
import { renameExpenseWithInactiveShares } from '../../../support/splitting/inactive-expense-command.js';

When('owner 僅修改既有含停用分攤者支出的項目', async ({ world }) => {
  await renameExpenseWithInactiveShares(world);
});
