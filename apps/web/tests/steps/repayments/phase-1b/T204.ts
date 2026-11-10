import { Then } from '../../../support/fixtures.js';
import { assertRepaymentFieldValidation } from '../../../support/splitting/repayment-field-validation-result.js';

Then('還款欄提示正數金額且帳務不變', async ({ page, world }) => {
  await assertRepaymentFieldValidation(page, world, 'amount');
});
