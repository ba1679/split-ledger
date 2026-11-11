import { Then } from '../../../support/fixtures.js';
import {
  inactiveRepaymentOptionsPhrase,
  assertInactiveRepaymentOptions,
} from '../../../support/splitting/inactive-repayment-options-result.js';

Then(inactiveRepaymentOptionsPhrase, async ({ page, world }, name: string) => {
  await assertInactiveRepaymentOptions(page, world, name);
});
