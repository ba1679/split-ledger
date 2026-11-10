import { Then } from '../../../support/fixtures.js';
import {
  assertRejectedTamperedOverpayment,
  rejectedTamperedOverpaymentPhrase,
} from '../../../support/splitting/rejected-tampered-overpayment.js';

Then(rejectedTamperedOverpaymentPhrase, async ({ world }) => {
  await assertRejectedTamperedOverpayment(world);
});
