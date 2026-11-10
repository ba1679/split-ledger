import { When } from '../../../support/fixtures.js';
import {
  invalidExpensePhrase,
  requestInvalidSharedExpense,
} from '../../../support/splitting/invalid-expense-command.js';

When(invalidExpensePhrase, async ({ world }, problem: string) => {
  await requestInvalidSharedExpense(world, problem);
});
