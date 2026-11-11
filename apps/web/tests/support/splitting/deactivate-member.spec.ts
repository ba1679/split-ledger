import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from '../../../../api/tests/support/splitting/harness.js';
import { seedBrowserReferencedMember } from './referenced-member-fixture.js';
import {
  assertMemberStatusPayload,
  deactivateBrowserMember,
  deactivateMemberPhrase,
  memberStatusChangeKey,
  type MemberStatusChange,
} from './deactivate-member.js';

test('T153: status payload rejects name, identity and unrelated field changes', () => {
  assertMemberStatusPayload({ isActive: false }, false);
  assertMemberStatusPayload({ isActive: true }, true);
  for (const payload of [
    {},
    { isActive: true },
    { isActive: 'false' },
    { isActive: false, name: 'Amy' },
    { isActive: false, id: 'replacement' },
  ])
    expect(() => assertMemberStatusPayload(payload, false)).toThrow();
});

test('T153: real UI confirms deactivation once with the original referenced companion UUID', async ({
  page,
  world,
}) => {
  await seedBrowserReferencedMember(page, world);
  await runIsolatedStep(
    {
      phrase: deactivateMemberPhrase,
      input: '小美',
      execute: (context, name) => deactivateBrowserMember(page, context, name),
    },
    world,
  );
  const state = world.get<MemberStatusChange>(memberStatusChangeKey);
  expect(state.status).toBe(200);
  expect(state.writes).toHaveLength(1);
  expect(state.memberId).toBe(world.splitting.ids.members.get('小美'));
});
