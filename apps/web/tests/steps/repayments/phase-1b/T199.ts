import { Then } from '../../../support/fixtures.js';
import {
  assertPendingOverpayment,
  pendingOverpaymentPhrase,
} from '../../../support/splitting/pending-overpayment-result.js';

Then(pendingOverpaymentPhrase, async ({ page, world }) => {
  await assertPendingOverpayment(page, world);
});
