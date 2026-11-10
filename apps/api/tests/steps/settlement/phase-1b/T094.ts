import { Then } from '../../../support/fixtures.js';
import {
  assertPreservedSettledExpense,
  preservedSettledExpensePhrase,
} from '../../../support/splitting/preserved-settled-expense-result.js';

Then(preservedSettledExpensePhrase, async ({ world }) => {
  await assertPreservedSettledExpense(world);
});
