import { When } from '../../../support/fixtures.js';
import {
  openRepaymentMembers,
  openRepaymentMembersPhrase,
} from '../../../support/splitting/open-repayment-members.js';

When(openRepaymentMembersPhrase, async ({ page, world }) => {
  await openRepaymentMembers(page, world);
});
