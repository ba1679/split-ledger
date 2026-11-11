import { Then } from '../../../support/fixtures.js';
import {
  assertRenamedMember,
  renamedMemberResultPhrase,
} from '../../../support/splitting/renamed-member-result.js';

Then(renamedMemberResultPhrase, async ({ world }, name: string) => {
  await assertRenamedMember(world, name);
});
