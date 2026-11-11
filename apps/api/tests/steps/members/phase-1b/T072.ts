import { Then } from '../../../support/fixtures.js';
import {
  assertDeletedCompanion,
  deletedMemberResultPhrase,
} from '../../../support/splitting/deleted-member-result.js';

Then(deletedMemberResultPhrase, async ({ world }, name: string) => {
  await assertDeletedCompanion(world, name);
});
