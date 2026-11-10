import { Then } from '../../../support/fixtures.js';
import {
  inactiveExpenseOptionsPhrase,
  assertInactiveExpenseOptions,
} from '../../../support/splitting/inactive-expense-options-result.js';

Then(inactiveExpenseOptionsPhrase, async ({ page, world }, name: string) => {
  await assertInactiveExpenseOptions(page, world, name);
});
