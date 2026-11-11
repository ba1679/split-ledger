import { Given } from '../../../support/fixtures.js';
import {
  lowerExpenseOnAnotherDevice,
  staleBrowserWarningPhrase,
} from '../../../support/splitting/stale-overpayment-warning.js';

Given(staleBrowserWarningPhrase, async ({ page, world }) => {
  await lowerExpenseOnAnotherDevice(page, world);
});
