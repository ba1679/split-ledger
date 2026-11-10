import { Then } from '../../../support/fixtures.js';
import {
  assertPreservedSettlementHistory,
  preservedSettlementHistoryPhrase,
} from '../../../support/splitting/preserved-settlement-history.js';

Then(preservedSettlementHistoryPhrase, async ({ world }) => {
  await assertPreservedSettlementHistory(world);
});
