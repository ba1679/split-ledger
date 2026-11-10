import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { splittingMemberId } from '../../../../api/tests/support/splitting/members-fixture.js';
import {
  referencedMemberPhrase,
  referencedMemberStateKey,
  seedBrowserReferencedMember,
} from './referenced-member-fixture.js';

test('T123: referenced member retains its UUID, lunch shares and actual repayment', async ({
  page,
  world,
}) => {
  await runIsolatedStep(
    {
      phrase: referencedMemberPhrase,
      input: undefined,
      execute: async (context) => seedBrowserReferencedMember(page, context),
    },
    world,
  );
  expect(world.get<{ memberId: string }>(referencedMemberStateKey).memberId).toBe(
    splittingMemberId(world, '小美'),
  );
  expect(world.users.size).toBe(1);
  expect(world.splitting.ids.members.size).toBe(3);
});
