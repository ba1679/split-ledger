import { When } from '../../../support/fixtures.js';
import {
  changeAdvanceAmountPhrase,
  changeExpenseAmount,
} from '../../../support/splitting/change-expense-amount.js';

When(changeAdvanceAmountPhrase, async ({ page, world }) => {
  await changeExpenseAmount(page, world, '代付', '800');
});
