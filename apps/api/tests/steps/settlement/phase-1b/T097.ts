import type { DataTable } from 'playwright-bdd';
import { Then } from '../../../support/fixtures.js';
import type { ExpenseArrangementRow } from '../../../support/splitting/expense-arrangements-result.js';
import {
  assertSettlementArrangements,
  settlementArrangementsPhrase,
} from '../../../support/splitting/settlement-arrangements-result.js';

Then(settlementArrangementsPhrase, async ({ world }, table: DataTable) => {
  await assertSettlementArrangements(world, table.hashes() as unknown as ExpenseArrangementRow[]);
});
