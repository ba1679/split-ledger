import { Then } from '../../../support/fixtures.js';
import {
  assertForeignRepaymentMemberUnavailable,
  foreignRepaymentMemberUnavailablePhrase,
} from '../../../support/splitting/foreign-repayment-member-result.js';

Then(foreignRepaymentMemberUnavailablePhrase, async ({ page, world }) => {
  await assertForeignRepaymentMemberUnavailable(page, world);
});
