import { Then } from '../../../support/fixtures.js';
import {
  assertCancelledOverpayment,
  cancelledOverpaymentResultPhrase,
} from '../../../support/splitting/cancelled-overpayment-result.js';

Then(cancelledOverpaymentResultPhrase, async ({ page, world }) => {
  await assertCancelledOverpayment(page, world);
});
