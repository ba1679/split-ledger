import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from './harness.js';
import { seedSplittingMembers, splittingTripId } from './members-fixture.js';
import { seedOtherTripMember } from './other-trip-member-fixture.js';

test('T015: another same-owner trip has the supplied companion without changing current members', async ({
  world,
}) => {
  await seedSplittingMembers(world);
  const tripId = splittingTripId(world);
  const currentMembers = new Map(world.splitting.ids.members);
  await runIsolatedStep(
    {
      phrase: '另一趟旅行已有同行者 {string}',
      input: '小美',
      execute: seedOtherTripMember,
    },
    world,
  );
  expect(world.get('splitting:otherTripId')).not.toBe(tripId);
  expect(splittingTripId(world)).toBe(tripId);
  for (const [name, id] of currentMembers) expect(world.splitting.ids.members.get(name)).toBe(id);
  expect(world.splitting.ids.members.get('台南旅行:小美')).toBe(
    world.get('splitting:otherMemberId'),
  );
  expect(world.users.size).toBe(1);
});
