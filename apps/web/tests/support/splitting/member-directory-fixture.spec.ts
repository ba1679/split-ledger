import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import {
  memberDirectoryPhrase,
  memberDirectoryStateKey,
  seedBrowserMemberDirectory,
} from './member-directory-fixture.js';

test('T121: owner Alice, active Amy and inactive Bob have stable directory identities', async ({
  page,
  world,
}) => {
  await runIsolatedStep(
    {
      phrase: memberDirectoryPhrase,
      input: undefined,
      execute: async (context) => seedBrowserMemberDirectory(page, context),
    },
    world,
  );
  expect(world.splitting.ids.members.size).toBe(3);
  expect(world.splitting.ids.members.has('Carol')).toBe(false);
  expect(world.get(memberDirectoryStateKey)).toBeDefined();
});
