import { Then } from '../../../support/fixtures.js';
import {
  assertMemberNameConflict,
  memberNameConflictPhrase,
} from '../../../support/splitting/member-name-conflict-result.js';

Then(memberNameConflictPhrase, async ({ page, world }) => {
  await assertMemberNameConflict(page, world);
});
