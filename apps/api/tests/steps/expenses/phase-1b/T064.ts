import { Then } from '../../../support/fixtures.js';
import {
  assertRejectedExpenseUpdate,
  rejectedExpenseUpdatePhrase,
} from '../../../support/splitting/rejected-expense-update.js';

Then(rejectedExpenseUpdatePhrase, async ({ world }) => {
  await assertRejectedExpenseUpdate(world);
});
