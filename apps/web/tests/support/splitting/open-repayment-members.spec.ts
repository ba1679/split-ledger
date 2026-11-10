import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { seedInactiveReferencedMember } from './inactive-referenced-member-fixture.js';
import {
  openRepaymentMembers,
  openRepaymentMembersPhrase,
  openedRepaymentMembersKey,
  type OpenedRepaymentMembers,
} from './open-repayment-members.js';

test('T162: opens only repayment member choices without changing historical identity', async ({
  page,
  world,
}) => {
  await seedInactiveReferencedMember(page, world, '小美');
  await runIsolatedStep(
    {
      phrase: openRepaymentMembersPhrase,
      input: undefined,
      execute: (context) => openRepaymentMembers(page, context),
    },
    world,
  );
  const state = world.get<OpenedRepaymentMembers>(openedRepaymentMembersKey);
  expect(state.members.find((member) => member.name === '小美')).toMatchObject({ isActive: false });
  expect(state.writes).toEqual([]);
  expect(state.after).toEqual(state.before);
});
