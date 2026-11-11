import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import { splittingTripId } from './members-fixture.js';
import { captureSplittingRejectionBaseline } from './rejection.js';

export const unauthenticatedSettlementPhrase = '未登入者嘗試讀取分帳結算';

export async function requestUnauthenticatedSettlement(world: LedgerWorld): Promise<void> {
  // Each scenario gets an empty API context; authenticated helpers send explicit Cookie headers.
  // Check its storage before the Act so this request cannot accidentally inherit an owner session.
  const storage = await world.api.storageState();
  expect(storage.cookies, 'The unauthenticated request context must contain no cookies').toEqual(
    [],
  );
  await captureSplittingRejectionBaseline(world, null);
  world.response = await world.api.get(`/api/trips/${splittingTripId(world)}/settlement`);
}
