import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import type { TripScope } from '../../../src/modules/trips/management/lifecycle.js';
import type { TripManagementHooks } from '../../../src/modules/trips/management/dependencies.js';

/** Passive scenario dispatch. The real product job's outer finally must emit completion. */
export function createScenarioTripManagementHooks(
  worlds: Iterable<LedgerWorld>,
): TripManagementHooks {
  const matches = (world: LedgerWorld, scope: TripScope) =>
    [...world.tripManagement.ids.trips.values()].includes(scope.tripId) &&
    [...world.users.values()].some((user) => user.id === scope.ownerId);

  return {
    async beforeTripLock(scope) {
      for (const world of worlds)
        if (matches(world, scope)) await world.tripManagement.hooks?.beforeTripLock?.(scope);
    },
    async afterTripLock(scope) {
      for (const world of worlds)
        if (matches(world, scope)) await world.tripManagement.hooks?.afterTripLock?.(scope);
    },
    async afterThumbnailJob(scope) {
      for (const world of worlds)
        if (matches(world, scope)) await world.tripManagement.hooks?.afterThumbnailJob?.(scope);
    },
  };
}

export function observeThumbnailJobs(
  world: LedgerWorld,
  tripId: string,
  operationIds: readonly string[],
) {
  const counts = new Map(operationIds.map((id) => [id, 0]));
  const previous = world.tripManagement.hooks?.afterThumbnailJob;
  const observe: NonNullable<TripManagementHooks['afterThumbnailJob']> = async (scope) => {
    await previous?.(scope);
    if (scope.tripId !== tripId || !counts.has(scope.operationId)) return;
    expect(scope.ownerId).toBe(world.users.get('Alice')!.id);
    counts.set(scope.operationId, counts.get(scope.operationId)! + 1);
  };
  world.tripManagement.hooks = { ...world.tripManagement.hooks, afterThumbnailJob: observe };
  world.tripManagement.cleanups.add(async () => {
    if (world.tripManagement.hooks?.afterThumbnailJob === observe)
      world.tripManagement.hooks = { ...world.tripManagement.hooks, afterThumbnailJob: previous };
  });

  return {
    assertPending() {
      expect(
        [...counts.values()],
        'Timeout response must not count as full job completion while native output remains held',
      ).toEqual(operationIds.map(() => 0));
    },
    async waitForFinished() {
      for (const operationId of operationIds)
        await expect
          .poll(() => counts.get(operationId), {
            timeout: 10000,
            message:
              'The real released thumbnail job must finish its full native/DB continuation; no response/sleep fallback',
          })
          .toBe(1);
      expect([...counts.values()]).toEqual(operationIds.map(() => 1));
    },
  };
}
