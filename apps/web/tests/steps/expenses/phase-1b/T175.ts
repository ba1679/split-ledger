import { Then } from '../../../support/fixtures.js';
import { assertExpenseFieldValidation } from '../../../support/splitting/expense-field-validation-result.js';

Then('分攤欄提示至少選一人且帳務不變', async ({ page, world }) => {
  await assertExpenseFieldValidation(page, world, 'shares');
});
