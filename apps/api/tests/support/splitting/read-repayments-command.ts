import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import { splittingTripId } from './members-fixture.js';

export const readRepaymentsPhrase = 'owner 查詢旅行實際還款紀錄';

/** Keep the single authoritative GET reply intact for the following Then. */
export async function readTripRepayments(world: LedgerWorld): Promise<void> {
  const owner = world.users.get('甲');

  expect(owner, 'Repayment query requires the owner session').toBeDefined();
  world.response = await world.api.get(`/api/trips/${splittingTripId(world)}/repayments`, {
    headers: { Cookie: owner!.cookie },
  });
  world.set('splitting:reply', await world.response.json());
  expect(
    world.response.status(),
    'Product must provide the travel repayment history endpoint',
  ).toBe(200);
}
