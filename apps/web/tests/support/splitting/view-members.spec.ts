import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { seedBrowserMemberDirectory } from './member-directory-fixture.js';
import {
  viewBrowserMembers,
  viewedMembersKey,
  viewMembersPhrase,
  type ViewedMembers,
} from './view-members.js';

test('T158: viewing the real directory preserves its owner and ledger without writes', async ({
  page,
  world,
}) => {
  await seedBrowserMemberDirectory(page, world);
  await runIsolatedStep(
    {
      phrase: viewMembersPhrase,
      input: undefined,
      execute: (context) => viewBrowserMembers(page, context),
    },
    world,
  );
  const state = world.get<ViewedMembers>(viewedMembersKey);
  expect(state.members.find((member) => member.name === 'Alice')).toMatchObject({
    role: 'owner',
    isActive: true,
  });
  expect(state.writes).toEqual([]);
  expect(state.after).toEqual(state.before);
});
