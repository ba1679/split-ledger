import { When } from '../../../support/fixtures.js';
import {
  confirmStaleMemberDeletion,
  confirmStaleMemberDeletionPhrase,
} from '../../../support/splitting/confirm-stale-member-deletion.js';

When(confirmStaleMemberDeletionPhrase, async ({ page, world }, name: string) => {
  await confirmStaleMemberDeletion(page, world, name);
});
