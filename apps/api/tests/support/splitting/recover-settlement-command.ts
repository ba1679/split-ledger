import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import type { LostSettlementCommand } from './lost-settlement-fixture.js';
import { splittingTripId } from './members-fixture.js';

export const recoverSettlementPhrase = 'owner 查證先前已保存的結清紀錄';

/** Recover the committed record by its reserved ID without repeating its write. */
export async function recoverSavedSettlement(world: LedgerWorld): Promise<void> {
  const owner = world.users.get('甲');
  expect(owner, 'Settlement recovery requires the owner session').toBeDefined();
  const command = world.get<LostSettlementCommand>('splitting:lostSettlementCommand');
  world.response = await world.api.get(
    `/api/trips/${splittingTripId(world)}/settlements/${command.id}`,
    { headers: { Cookie: owner!.cookie } },
  );
  world.set('splitting:reply', await world.response.json());
  expect(world.response.status(), 'Product must provide saved settlement recovery by ID').toBe(200);
}
