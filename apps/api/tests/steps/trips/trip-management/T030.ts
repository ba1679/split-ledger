import { When } from '../../../support/fixtures.js';
import type { RecordedTripCommand } from '../../../support/trip-management/commands.js';
import { managementSnapshot, sharedSnapshot } from '../../../support/trip-management/baseline.js';
import { ownerRead } from '../../../support/trip-management/preservation.js';

When('owner 查證同一次原旅行操作', async ({ world }) => {
  const original = world.get<RecordedTripCommand>('management:originalCommand');

  world.set('management:before', await managementSnapshot(world));
  world.set('management:sharedBefore', await sharedSnapshot(world));
  world.response = await ownerRead(
    world,
    `/api/trips/${original.tripId}/operations/${original.operationId}`,
  );
  const body = await world.response.json();

  world.set('management:verificationResult', body.result);
  world.set('management:verificationCurrentState', body.currentState);
});
