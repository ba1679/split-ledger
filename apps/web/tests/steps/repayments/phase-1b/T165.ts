import { When } from '../../../support/fixtures.js';
import {
  cancelBrowserOverpayment,
  cancelOverpaymentPhrase,
} from '../../../support/splitting/cancel-overpayment.js';

When(cancelOverpaymentPhrase, async ({ page, world }) => {
  await cancelBrowserOverpayment(page, world);
});
