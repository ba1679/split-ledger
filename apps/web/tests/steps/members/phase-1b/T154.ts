import { When } from '../../../support/fixtures.js';
import {
  deleteBrowserMember,
  deleteMemberPhrase,
} from '../../../support/splitting/delete-member.js';

When(deleteMemberPhrase, async ({ page, world }, name: string) => {
  await deleteBrowserMember(page, world, name);
});
