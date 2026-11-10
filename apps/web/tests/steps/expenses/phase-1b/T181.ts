import { Then } from '../../../support/fixtures.js';
import {
  assertExpenseShareDisplay,
  expenseShareDisplayPhrase,
} from '../../../support/splitting/expense-share-display-result.js';

Then(expenseShareDisplayPhrase, async ({ page, world }, display: string) => {
  await assertExpenseShareDisplay(page, world, display);
});
