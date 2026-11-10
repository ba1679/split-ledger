import type { DataTable } from 'playwright-bdd';
import { Then } from '../../../support/fixtures.js';
import {
  assertMemberBalancesScreen,
  memberBalancesScreenPhrase,
  type ScreenMemberBalanceRow,
} from '../../../support/splitting/member-balances-screen-result.js';

Then(memberBalancesScreenPhrase, async ({ page, world }, table: DataTable) => {
  await assertMemberBalancesScreen(
    page,
    world,
    table.hashes() as unknown as ScreenMemberBalanceRow[],
  );
});
