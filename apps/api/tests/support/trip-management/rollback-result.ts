import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import type { TripManagementSnapshot } from './context.js';
import type { CommandFault } from './transaction-fault.js';
import { managementSnapshot, managementTripId, sharedSnapshot } from './baseline.js';
import { ownerRead } from './preservation.js';
import { expectedCurrentState } from './rejections.js';

export async function assertCommandRollback(world: LedgerWorld): Promise<void> {
  const fault = world.get<CommandFault>('management:fault');

  expect(
    await fault.reached(),
    'A missing route or early rejection is not an in-transaction failure',
  ).toBe(true);
  expect(world.response!.status()).toBe(500);
  const body = await world.response!.json();

  expect(body).toMatchObject({ code: 'INTERNAL_ERROR', message: expect.any(String) });
  expect(JSON.stringify(body)).not.toContain('P0001');
  expect(JSON.stringify(body)).not.toContain('006 isolated command fault');
  const before = world.get<TripManagementSnapshot>('management:before');
  const shared = world.get('management:sharedBefore');

  expect(
    await managementSnapshot(world),
    'All authoritative rows, bytes, versions, reservations and receipts roll back',
  ).toEqual(before);
  expect(await sharedSnapshot(world)).toEqual(shared);
  const state = await ownerRead(world, `/api/trips/${managementTripId(world)}/state`);

  expect(state.status()).toBe(200);
  expect(await state.json()).toEqual(expectedCurrentState(before));
  expect(await managementSnapshot(world)).toEqual(before);
}
