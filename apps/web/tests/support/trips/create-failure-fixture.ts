import { expect } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { installCreateRejection } from './create-rejection.js';
import { managementUI } from './management-fixture.js';
import { assertNewTripNotCreated } from './uncommitted-new-trip.js';
import { submitNewTrip } from './new-trip-flow.js';
import { assertCreateFailure } from './create-failure-result.js';

export async function armCreateFailure(world: LedgerWorld) {
  await assertNewTripNotCreated(world);
  const rejection = await installCreateRejection(managementUI(world).page);

  world.tripManagement.cleanups.add(rejection.dispose);
  expect(rejection.attempts().length).toBe(0);
  world.set('management:createRejection', rejection);

  return rejection;
}

export async function arrangeResolvedCreateFailure(world: LedgerWorld): Promise<void> {
  const rejection = await armCreateFailure(world);

  // This is the previous failed intent; the scenario's next When is the sole retry.
  await submitNewTrip(world);
  await assertCreateFailure(world);
  await rejection.dispose();
  world.tripManagement.cleanups.delete(rejection.dispose);
  expect(world.tripManagement.cleanups.has(rejection.dispose)).toBe(false);
  world.set('management:createFailureCleared', true);
}
