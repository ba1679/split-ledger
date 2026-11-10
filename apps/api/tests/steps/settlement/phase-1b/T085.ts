import { Then } from '../../../support/fixtures.js';
import {
  assertMemberBalances,
  memberBalancesResultPhrase,
  type MemberBalanceTableRow,
} from '../../../support/splitting/member-balances-result.js';

Then(memberBalancesResultPhrase, async ({ world }, table) => {
  await assertMemberBalances(world, table.hashes() as unknown as MemberBalanceTableRow[]);
});
