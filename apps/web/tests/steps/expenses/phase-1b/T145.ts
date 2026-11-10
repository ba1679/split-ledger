import { When } from '../../../support/fixtures.js';
import {
  saveSharedExpense,
  saveSharedExpensePhrase,
} from '../../../support/splitting/save-shared-expense.js';

When(saveSharedExpensePhrase, async ({ page, world }) => {
  await saveSharedExpense(page, world);
});
