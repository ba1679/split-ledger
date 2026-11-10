import { Then } from '../../../support/fixtures.js';
import {
  assertPositiveSettlementClosed,
  positiveSettlementClosedPhrase,
} from '../../../support/splitting/positive-settlement-closed-result.js';

Then(positiveSettlementClosedPhrase, async ({ world }) => {
  await assertPositiveSettlementClosed(world);
});
