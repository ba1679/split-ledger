import { When } from '../../../support/fixtures.js';
import { deleteSharedExpense } from '../../../support/splitting/delete-shared-expense.js';

When('owner 刪除共同支出點心', async ({ page, world }) => {
  await deleteSharedExpense(page, world, '點心');
});
