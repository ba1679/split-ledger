import type { DataTable } from 'playwright-bdd';
import { Then } from '../../../support/fixtures.js';
import {
  assertExpenseArrangements,
  expenseArrangementsPhrase,
  type ExpenseArrangementRow,
} from '../../../support/splitting/expense-arrangements-result.js';

Then(expenseArrangementsPhrase, async ({ world }, table: DataTable) => {
  await assertExpenseArrangements(world, table.hashes() as unknown as ExpenseArrangementRow[]);
});
