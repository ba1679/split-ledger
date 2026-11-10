import { When } from '../../../support/fixtures.js';
import {
  confirmOverpaymentPhrase,
  submitConfirmedOverpayment,
} from '../../../support/splitting/confirm-overpayment-command.js';

When(confirmOverpaymentPhrase, async ({ world }) => {
  await submitConfirmedOverpayment(world);
});
