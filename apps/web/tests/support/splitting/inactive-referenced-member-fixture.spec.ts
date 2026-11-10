import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { splittingMemberId } from '../../../../api/tests/support/splitting/members-fixture.js';
import {
  inactiveReferencedMemberPhrase,
  inactiveReferencedMemberStateKey,
  seedInactiveReferencedMember,
} from './inactive-referenced-member-fixture.js';

test('T125: deactivate the parameterized historical companion through the real API', async ({
  page,
  world,
}) => {
  await runIsolatedStep(
    {
      phrase: inactiveReferencedMemberPhrase,
      input: '小美',
      execute: (context) => seedInactiveReferencedMember(page, context, '小美'),
    },
    world,
  );
  expect(world.get<{ memberId: string }>(inactiveReferencedMemberStateKey).memberId).toBe(
    splittingMemberId(world, '小美'),
  );
  expect(world.users.size).toBe(1);
});
