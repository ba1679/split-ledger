import type { DataTable } from 'playwright-bdd';
import { Then } from '../../../support/fixtures.js';
import type { ExpenseArrangementRow } from '../../../support/splitting/expense-arrangements-result.js';
import {
  assertRepaymentArrangements,
  repaymentArrangementsPhrase,
} from '../../../support/splitting/repayment-arrangements-result.js';

Then(repaymentArrangementsPhrase, async ({ world }, table: DataTable) => {
  await assertRepaymentArrangements(world, table.hashes() as unknown as ExpenseArrangementRow[]);
});
