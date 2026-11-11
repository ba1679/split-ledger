import { Then } from '../../../support/fixtures.js';
import {
  assertUnconfirmedSettlement,
  unconfirmedSettlementPhrase,
} from '../../../support/splitting/unconfirmed-settlement-result.js';

Then(unconfirmedSettlementPhrase, async ({ page, world }) => {
  await assertUnconfirmedSettlement(page, world);
});
