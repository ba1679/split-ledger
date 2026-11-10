import { Then } from '../../../support/fixtures.js';
import {
  assertDeletedMemberOptions,
  deletedMemberOptionsPhrase,
} from '../../../support/splitting/deleted-member-options-result.js';

Then(deletedMemberOptionsPhrase, async ({ page, world }, name: string) => {
  await assertDeletedMemberOptions(page, world, name);
});
