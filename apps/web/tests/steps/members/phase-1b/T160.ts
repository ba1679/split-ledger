import { When } from '../../../support/fixtures.js';
import {
  reactivateBrowserMember,
  reactivateMemberPhrase,
} from '../../../support/splitting/reactivate-member.js';

When(reactivateMemberPhrase, async ({ page, world }, name: string) => {
  await reactivateBrowserMember(page, world, name);
});
