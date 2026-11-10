import { Then } from '../../../support/fixtures.js';
import {
  assertUnconfirmedExpenseCorrection,
  unconfirmedExpenseCorrectionPhrase,
} from '../../../support/splitting/unconfirmed-expense-correction-result.js';

Then(unconfirmedExpenseCorrectionPhrase, async ({ page, world }) => {
  await assertUnconfirmedExpenseCorrection(page, world);
});
