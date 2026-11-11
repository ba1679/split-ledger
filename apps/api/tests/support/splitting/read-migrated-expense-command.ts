import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import { expenseAuthorityWorld } from './legacy-fixture.js';

/** Read the migrated database through its own running API and owner session. */
export async function readMigratedFlightExpense(world: LedgerWorld): Promise<void> {
  const authority = expenseAuthorityWorld(world);
  const expenseId = authority.splitting.ids.expenses.get('機票');
  const tripId = authority.get<string>('splitting:tripId');
  const owner = authority.users.get('甲');
  expect(expenseId, 'Legacy fixture must expose the migrated flight ID').toBeDefined();
  expect(owner, 'Legacy fixture must expose the owner session').toBeDefined();
  world.set('splitting:expenseId', expenseId);
  world.response = await authority.api.get(`/api/trips/${tripId}/expenses/${expenseId}`, {
    headers: { Cookie: owner!.cookie },
  });
  world.set('splitting:reply', await world.response.json());
  expect(world.response.status(), 'Product must allow reading the migrated expense').toBe(200);
}
