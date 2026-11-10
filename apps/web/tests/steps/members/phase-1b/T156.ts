import { When } from '../../../support/fixtures.js';
import {
  renameBrowserMember,
  renameMemberPhrase,
} from '../../../support/splitting/rename-member.js';

When(renameMemberPhrase, async ({ page, world }, oldName: string, newName: string) => {
  await renameBrowserMember(page, world, oldName, newName);
});
