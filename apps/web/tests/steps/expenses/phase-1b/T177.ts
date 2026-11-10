import { Then } from '../../../support/fixtures.js';
import {
  assertPreservedIndependentRepaymentScreen,
  preservedIndependentRepaymentPhrase,
} from '../../../support/splitting/preserved-independent-repayment-result.js';

Then(preservedIndependentRepaymentPhrase, async ({ page, world }) => {
  await assertPreservedIndependentRepaymentScreen(page, world);
});
