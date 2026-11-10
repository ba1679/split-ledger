import { Given } from '../../../support/fixtures.js';
import {
  staleMemberDeletionPhrase,
  seedBrowserStaleMemberDeletion,
} from '../../../support/splitting/stale-member-deletion-fixture.js';

Given(staleMemberDeletionPhrase, async ({ page, world }) => {
  await seedBrowserStaleMemberDeletion(page, world);
});
