import { Then } from '../../../support/fixtures.js';
import {
  assertPersonalFlightExpense,
  personalFlightExpensePhrase,
} from '../../../support/splitting/personal-flight-expense-result.js';

Then(personalFlightExpensePhrase, async ({ world }) => {
  await assertPersonalFlightExpense(world);
});
