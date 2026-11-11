import { Then } from '../../../support/fixtures.js';
import {
  assertReferencedMemberDeletionRejected,
  referencedMemberDeletionPhrase,
} from '../../../support/splitting/referenced-member-deletion-result.js';

Then(referencedMemberDeletionPhrase, async ({ page, world }) => {
  await assertReferencedMemberDeletionRejected(page, world);
});
