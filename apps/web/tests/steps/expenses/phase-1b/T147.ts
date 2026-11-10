import { When } from '../../../support/fixtures.js';
import {
  deleteDinnerPhrase,
  deleteSharedExpense,
} from '../../../support/splitting/delete-shared-expense.js';

When(deleteDinnerPhrase, async ({ page, world }) => {
  await deleteSharedExpense(page, world, '晚餐');
});
