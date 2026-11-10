import { Then } from '../../../support/fixtures.js';
import {
  assertExpenseFieldValidation,
  missingPayerResultPhrase,
} from '../../../support/splitting/expense-field-validation-result.js';

Then(missingPayerResultPhrase, async ({ page, world }) => {
  await assertExpenseFieldValidation(page, world, 'payer');
});
