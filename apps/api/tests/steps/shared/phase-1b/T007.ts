import type { DataTable } from 'playwright-bdd';
import { Given } from '../../../support/fixtures.js';
import {
  seedSplittingExpenses,
  type SplittingExpenseRow,
} from '../../../support/splitting/expense-fixture.js';

export const splittingExpensesPhrase = 'owner 的分帳旅行已有下列支出：';

Given(splittingExpensesPhrase, async ({ world }, table: DataTable) => {
  await seedSplittingExpenses(world, table.hashes() as unknown as SplittingExpenseRow[]);
});
