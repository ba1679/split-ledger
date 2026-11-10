import { test } from '../fixtures.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { seedBrowserStaleMemberDeletion } from './stale-member-deletion-fixture.js';
import {
  confirmStaleMemberDeletion,
  confirmStaleMemberDeletionPhrase,
} from './confirm-stale-member-deletion.js';

test('T159: original stale Amy confirmation submits one DELETE and captures MEMBER_IN_USE', async ({
  page,
  world,
}) => {
  await seedBrowserStaleMemberDeletion(page, world);
  await runIsolatedStep(
    {
      phrase: confirmStaleMemberDeletionPhrase,
      input: 'Amy',
      execute: async (context, name) => confirmStaleMemberDeletion(page, context, name),
    },
    world,
  );
});
