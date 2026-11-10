import { Then } from '../../../support/fixtures.js';
import {
  assertPreservedRepaymentHistory,
  preservedRepaymentHistoryPhrase,
} from '../../../support/splitting/preserved-repayment-history.js';

Then(preservedRepaymentHistoryPhrase, async ({ world }) => {
  await assertPreservedRepaymentHistory(world);
});
