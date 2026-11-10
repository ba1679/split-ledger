import { Given } from '../../../support/fixtures.js';
import {
  arrangeBrowserOverpaymentWarning,
  browserOverpaymentWarningPhrase,
} from '../../../support/splitting/overpayment-warning.js';

Given(browserOverpaymentWarningPhrase, async ({ page, world }) => {
  await arrangeBrowserOverpaymentWarning(page, world);
});
