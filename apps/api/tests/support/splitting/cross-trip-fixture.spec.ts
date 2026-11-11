import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from './harness.js';
import {
  crossTripFixtureKey,
  seedCrossTripSplittingResources,
  type CrossTripSplittingFixture,
} from './cross-trip-fixture.js';

test('T011: same-owner cross-trip children exist with complete immutable payment history', async ({
  world,
}) => {
  await runIsolatedStep(
    {
      phrase: '同一owner的另一趟旅行有可讀寫分帳子資源',
      input: undefined,
      execute: seedCrossTripSplittingResources,
    },
    world,
  );
  const fixture = world.get<CrossTripSplittingFixture>(crossTripFixtureKey);

  expect(fixture.currentTripId).not.toBe(fixture.otherTripId);
  expect(fixture.currentBefore.trips[0]!.owner_id).toBe(fixture.otherBefore.trips[0]!.owner_id);
  expect(new Set(Object.values(fixture.childIds)).size).toBe(4);
  expect(world.users.size).toBe(1);
  expect(fixture.otherWorld.users.size).toBe(1);
});
