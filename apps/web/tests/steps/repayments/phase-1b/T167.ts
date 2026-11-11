import { When } from '../../../support/fixtures.js';
import {
  openIndependentRepaymentMembers,
  openIndependentRepaymentMembersPhrase,
} from '../../../support/splitting/open-independent-repayment-members.js';

When(openIndependentRepaymentMembersPhrase, async ({ page, world }) => {
  await openIndependentRepaymentMembers(page, world);
});
