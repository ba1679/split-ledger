import { When } from '../../../support/fixtures.js';
import {
  confirmBrowserOverpayment,
  confirmOverpaymentPhrase,
} from '../../../support/splitting/confirm-overpayment.js';

When(confirmOverpaymentPhrase, async ({ page, world }) => {
  await confirmBrowserOverpayment(page, world);
});
