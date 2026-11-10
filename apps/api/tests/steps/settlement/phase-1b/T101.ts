import { Then } from '../../../support/fixtures.js';
import {
  assertNoSettlementRemainder,
  noSettlementRemainderPhrase,
} from '../../../support/splitting/no-settlement-remainder-result.js';

Then(noSettlementRemainderPhrase, async ({ world }) => {
  await assertNoSettlementRemainder(world);
});
