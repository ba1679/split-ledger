import { Given } from '../../../support/fixtures.js';
import {
  arrangeLostExpenseCorrection,
  lostExpenseCorrectionPhrase,
} from '../../../support/splitting/lost-expense-correction.js';

Given(lostExpenseCorrectionPhrase, async ({ page, world }) => {
  await arrangeLostExpenseCorrection(page, world);
});
