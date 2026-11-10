import { Given } from '../../../support/fixtures.js';
import {
  memberDirectoryPhrase,
  seedBrowserMemberDirectory,
} from '../../../support/splitting/member-directory-fixture.js';

Given(memberDirectoryPhrase, async ({ page, world }) => {
  await seedBrowserMemberDirectory(page, world);
});
