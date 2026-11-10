import { Then } from '../../../support/fixtures.js';
import {
  assertUnconfirmedRepayment,
  unconfirmedRepaymentPhrase,
} from '../../../support/splitting/unconfirmed-repayment-result.js';

Then(unconfirmedRepaymentPhrase, async ({ page, world }) => {
  await assertUnconfirmedRepayment(page, world);
});
