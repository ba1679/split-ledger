import { Then, expect } from '../../../support/fixtures.js';
import type { TripManagementSnapshot } from '../../../support/trip-management/context.js';
import type { RecordedTripCommand } from '../../../support/trip-management/commands.js';
import type { holdTripRow } from '../../../support/trip-management/row-lock.js';
import { managementSnapshot, sharedSnapshot } from '../../../support/trip-management/baseline.js';
import { ownerRead } from '../../../support/trip-management/preservation.js';
import { expectedCurrentState } from '../../../support/trip-management/rejections.js';

Then('查無收據不等於命令失敗', async ({ world }) => {
  const before = world.get<TripManagementSnapshot>('management:before');
  const original = world.get<RecordedTripCommand>('management:originalCommand');
  const barrier = world.get<Awaited<ReturnType<typeof holdTripRow>>>('management:pendingBarrier');

  expect(world.response!.status()).toBe(404);
  const body = await world.response!.json();

  expect(body).toMatchObject({ code: 'OPERATION_NOT_FOUND', message: expect.any(String) });
  expect(Object.keys(body).sort()).toEqual(['code', 'message']);
  expect(before.receipts.some((row) => row.operation_id === original.operationId)).toBe(false);
  await barrier.waitForBlockedWriter();
  expect(await managementSnapshot(world)).toEqual(before);
  expect(await sharedSnapshot(world)).toEqual(world.get('management:sharedBefore'));
  const state = await ownerRead(world, `/api/trips/${original.tripId}/state`);

  expect(state.status()).toBe(200);
  expect(await state.json()).toEqual(expectedCurrentState(before));
  expect((await state.json()).state).toBe('active');
  expect(await managementSnapshot(world)).toEqual(before);
  // The original request is still waiting. Scenario teardown releases it and verifies its commit.
  await barrier.waitForBlockedWriter();
});
