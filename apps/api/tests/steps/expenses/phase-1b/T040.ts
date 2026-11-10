import type { DataTable } from 'playwright-bdd';
import { When } from '../../../support/fixtures.js';
import type { SplittingExpenseRow } from '../../../support/splitting/expense-fixture.js';
import {
  recordSharedExpense,
  sharedExpensePhrase,
} from '../../../support/splitting/shared-expense-command.js';

When(sharedExpensePhrase, async ({ world }, table: DataTable) => {
  await recordSharedExpense(world, table.hashes() as unknown as SplittingExpenseRow[]);
});
