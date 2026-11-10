import { When } from '../../../support/fixtures.js';
import {
  submitTamperedOverpayment,
  tamperedOverpaymentPhrase,
} from '../../../support/splitting/tampered-overpayment-command.js';

When(tamperedOverpaymentPhrase, async ({ world }) => {
  await submitTamperedOverpayment(world);
});
