import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { seedInactiveReferencedMember } from './inactive-referenced-member-fixture.js';
import { memberStatusChangeKey, type MemberStatusChange } from './deactivate-member.js';
import { reactivateBrowserMember, reactivateMemberPhrase } from './reactivate-member.js';

test('T160: real UI reactivates the original inactive referenced companion once', async ({
  page,
  world,
}) => {
  await seedInactiveReferencedMember(page, world, 'Amy');
  const memberId = world.splitting.ids.members.get('Amy');
  await runIsolatedStep(
    {
      phrase: reactivateMemberPhrase,
      input: 'Amy',
      execute: (context, name) => reactivateBrowserMember(page, context, name),
    },
    world,
  );
  const state = world.get<MemberStatusChange>(memberStatusChangeKey);
  expect(state.memberId).toBe(memberId);
  expect(state.status).toBe(200);
  expect(state.isActive).toBe(true);
  expect(state.writes).toHaveLength(1);
});
