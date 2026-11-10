import { Then } from '../../../support/fixtures.js';
import {
  assertSavedPartialRepaymentScreen,
  savedPartialRepaymentPhrase,
} from '../../../support/splitting/saved-partial-repayment-result.js';

Then(savedPartialRepaymentPhrase, async ({ page, world }) => {
  await assertSavedPartialRepaymentScreen(page, world);
});
