import { Then } from '../../../support/fixtures.js';
import {
  assertUnsavedOverpaymentWarning,
  overpaymentWarningResultPhrase,
} from '../../../support/splitting/overpayment-warning-result.js';

Then(overpaymentWarningResultPhrase, async ({ world }) => {
  await assertUnsavedOverpaymentWarning(world);
});
