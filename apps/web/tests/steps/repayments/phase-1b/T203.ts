import { Then } from '../../../support/fixtures.js';
import {
  assertRepaymentFieldValidation,
  sameRepaymentPartiesResultPhrase,
} from '../../../support/splitting/repayment-field-validation-result.js';

Then(sameRepaymentPartiesResultPhrase, async ({ page, world }) => {
  await assertRepaymentFieldValidation(page, world, 'parties');
});
