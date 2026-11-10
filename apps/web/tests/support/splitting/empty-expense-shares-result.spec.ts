import { test } from '../fixtures.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { fillSnackWithoutShares } from './empty-expense-shares.js';
import { saveSharedExpense } from './save-shared-expense.js';
import { assertExpenseFieldValidation } from './expense-field-validation-result.js';

test('T175: empty shares retain the actual draft and authoritative sources after one save', async ({
  page,
  world,
}) => {
  await fillSnackWithoutShares(page, world);
  await saveSharedExpense(page, world);
  await runIsolatedStep(
    {
      phrase: '分攤欄提示至少選一人且帳務不變',
      input: undefined,
      execute: (context) => assertExpenseFieldValidation(page, context, 'shares'),
    },
    world,
  );
});
