import { When } from '../../../support/fixtures.js';
import {
  saveExpenseCorrection,
  saveExpenseCorrectionPhrase,
} from '../../../support/splitting/save-expense-correction.js';

When(saveExpenseCorrectionPhrase, async ({ page, world }) => {
  await saveExpenseCorrection(page, world);
});
