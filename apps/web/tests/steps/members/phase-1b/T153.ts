import { When } from '../../../support/fixtures.js';
import {
  deactivateBrowserMember,
  deactivateMemberPhrase,
} from '../../../support/splitting/deactivate-member.js';

When(deactivateMemberPhrase, async ({ page, world }, name: string) => {
  await deactivateBrowserMember(page, world, name);
});
