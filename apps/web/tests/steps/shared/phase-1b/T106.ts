import type { DataTable } from 'playwright-bdd';
import { Given } from '../../../support/fixtures.js';
import {
  browserSplittingExpensesPhrase,
  seedBrowserSplittingExpenses,
} from '../../../support/splitting/fixture.js';
import type { SplittingExpenseRow } from '../../../../../api/tests/support/splitting/expense-fixture.js';

Given(browserSplittingExpensesPhrase, async ({ page, world }, table: DataTable) => {
  await seedBrowserSplittingExpenses(
    page,
    world,
    table.hashes() as unknown as SplittingExpenseRow[],
  );
});
