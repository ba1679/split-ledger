import { Then } from '../../../support/fixtures.js';
import {
  assertStaleSettlementRejected,
  staleSettlementRejectedPhrase,
} from '../../../support/splitting/stale-settlement-rejected-result.js';

Then(staleSettlementRejectedPhrase, async ({ page, world }) => {
  await assertStaleSettlementRejected(page, world);
});
