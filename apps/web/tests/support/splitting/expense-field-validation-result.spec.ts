import { test } from '../fixtures.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { fillMissingPayerDraft } from './missing-payer-draft.js';
import { saveSharedExpense } from './save-shared-expense.js';
import {
  assertExpenseFieldValidation,
  missingPayerResultPhrase,
} from './expense-field-validation-result.js';

test('T173: missing payer retains the actual draft and all authoritative sources after one save', async ({
  page,
  world,
}) => {
  await fillMissingPayerDraft(page, world);
  await saveSharedExpense(page, world);
  await runIsolatedStep(
    {
      phrase: missingPayerResultPhrase,
      input: undefined,
      execute: (context) => assertExpenseFieldValidation(page, context, 'payer'),
    },
    world,
  );
});
