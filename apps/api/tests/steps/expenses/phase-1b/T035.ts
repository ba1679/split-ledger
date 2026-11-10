import { When } from '../../../support/fixtures.js';
import {
  invalidExpenseUpdatePhrase,
  updateInvalidExpense,
} from '../../../support/splitting/update-invalid-expense-command.js';

When(invalidExpenseUpdatePhrase, async ({ world }, problem: string) => {
  await updateInvalidExpense(world, problem);
});
