import { Then } from '../../../support/fixtures.js';
import {
  assertCreatedExpenseShares,
  expenseShareResultPhrase,
  type ExpenseShareResultRow,
} from '../../../support/splitting/expense-share-result.js';

Then(expenseShareResultPhrase, async ({ world }, table) => {
  await assertCreatedExpenseShares(world, table.hashes() as unknown as ExpenseShareResultRow[]);
});
