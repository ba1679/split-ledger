import { Given } from '../../../support/fixtures.js';
import {
  referencedMemberPhrase,
  seedBrowserReferencedMember,
} from '../../../support/splitting/referenced-member-fixture.js';

Given(referencedMemberPhrase, async ({ page, world }) => {
  await seedBrowserReferencedMember(page, world);
});
