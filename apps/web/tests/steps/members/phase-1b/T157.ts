import { When } from '../../../support/fixtures.js';
import {
  createBrowserMember,
  createMemberPhrase,
} from '../../../support/splitting/create-member.js';

When(createMemberPhrase, async ({ page, world }, rawName: string) => {
  await createBrowserMember(page, world, rawName);
});
