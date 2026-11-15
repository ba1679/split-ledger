import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import type { TripManagementSnapshot } from './context.js';
import type { RecordedTripCommand } from './commands.js';
import { managementSnapshot, sharedSnapshot } from './baseline.js';
import { receiptResult } from './receipt-fixture.js';
import { expectedCurrentState } from './rejections.js';
import { ownerRead } from './preservation.js';

export async function assertOriginalAndCurrent(world: LedgerWorld): Promise<void> {
  const original = world.get<RecordedTripCommand>('management:originalCommand');
  const receipt = world.get<Record<string, unknown>>('management:originalReceipt');
  const before = world.get<TripManagementSnapshot>('management:before');
  const after = await managementSnapshot(world);

  expect(world.response!.status()).toBe(200);
  expect(await world.response!.json()).toEqual({
    result: receiptResult(receipt),
    currentState: expectedCurrentState(after),
  });
  expect(after.receipts.find((row) => row.operation_id === original.operationId)).toEqual(receipt);
  expect(after, 'A receipt lookup cannot overwrite a newer intent or mutate any source').toEqual(
    before,
  );
  expect(await sharedSnapshot(world)).toEqual(world.get('management:sharedBefore'));
  const state = await ownerRead(world, `/api/trips/${original.tripId}/state`);

  expect(state.status()).toBe(200);
  expect(await state.json()).toEqual(expectedCurrentState(after));
  const foreign = await world.api.get(
    `/api/trips/${original.tripId}/operations/${original.operationId}`,
    {
      headers: { cookie: world.users.get('Carol')!.cookie },
    },
  );

  expect(foreign.status()).toBe(404);
  const denied = await foreign.json();

  expect(denied).toMatchObject({ code: 'NOT_FOUND', message: expect.any(String) });
  expect(Object.keys(denied).sort()).toEqual(['code', 'message']);
  expect(JSON.stringify(denied)).not.toContain(original.tripId);
  expect(JSON.stringify(denied)).not.toContain(original.operationId);
  expect(await managementSnapshot(world)).toEqual(after);
  expect(await sharedSnapshot(world)).toEqual(world.get('management:sharedBefore'));
}
