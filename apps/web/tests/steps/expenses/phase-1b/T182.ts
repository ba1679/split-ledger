import { Then } from '../../../support/fixtures.js';
import {
  assertSavedThreeWayExpense,
  savedThreeWayExpensePhrase,
} from '../../../support/splitting/saved-three-way-expense-result.js';

Then(savedThreeWayExpensePhrase, async ({ page, world }) => {
  await assertSavedThreeWayExpense(page, world);
});
