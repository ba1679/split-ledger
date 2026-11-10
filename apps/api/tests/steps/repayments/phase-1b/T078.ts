import { Then } from '../../../support/fixtures.js';
import {
  assertSavedIndependentRepayment,
  savedIndependentRepaymentPhrase,
} from '../../../support/splitting/saved-independent-repayment-result.js';

Then(savedIndependentRepaymentPhrase, async ({ world }, amount: string) => {
  await assertSavedIndependentRepayment(world, amount);
});
