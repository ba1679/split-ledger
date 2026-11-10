import { Given } from '../../../support/fixtures.js';
import {
  inactiveReferencedMemberPhrase,
  seedInactiveReferencedMember,
} from '../../../support/splitting/inactive-referenced-member-fixture.js';

Given(inactiveReferencedMemberPhrase, async ({ page, world }, name: string) => {
  await seedInactiveReferencedMember(page, world, name);
});
