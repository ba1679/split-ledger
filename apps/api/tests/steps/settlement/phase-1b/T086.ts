import { Then } from '../../../support/fixtures.js';
import {
  assertRebuiltPaymentHistory,
  rebuiltPaymentHistoryPhrase,
} from '../../../support/splitting/rebuilt-payment-history-result.js';

Then(rebuiltPaymentHistoryPhrase, async ({ world }) => {
  await assertRebuiltPaymentHistory(world);
});
