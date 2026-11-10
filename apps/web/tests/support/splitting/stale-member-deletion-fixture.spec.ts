import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import {
  staleMemberDeletionPhrase,
  seedBrowserStaleMemberDeletion,
  staleMemberDeletionStateKey,
  type StaleMemberDeletionState,
} from './stale-member-deletion-fixture.js';

test('T126: independent owner session references Amy after original deletion confirmation opens', async ({
  page,
  world,
}) => {
  await runIsolatedStep(
    {
      phrase: staleMemberDeletionPhrase,
      input: undefined,
      execute: async (context) => seedBrowserStaleMemberDeletion(page, context),
    },
    world,
  );
  const state = world.get<StaleMemberDeletionState>(staleMemberDeletionStateKey);
  expect(state.before.sources.expenses).toEqual([]);
  expect(state.after.sources.expenses).toHaveLength(1);
  expect(state.pageWrites).toEqual([]);
  await expect(page.getByRole('dialog').filter({ hasText: 'Amy' })).toBeVisible();
});
