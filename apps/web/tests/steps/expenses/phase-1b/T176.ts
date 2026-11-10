import { Then } from '../../../support/fixtures.js';
import {
  assertPreservedSettlementPayment,
  preservedSettlementPaymentPhrase,
} from '../../../support/splitting/preserved-settlement-payment.js';

Then(preservedSettlementPaymentPhrase, async ({ page, world }) => {
  await assertPreservedSettlementPayment(page, world);
});
