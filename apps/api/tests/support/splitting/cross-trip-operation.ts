import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import type { Identity } from '../world.js';
import { crossTripFixtureKey, type CrossTripSplittingFixture } from './cross-trip-fixture.js';
import { snapshotSplittingSources } from './expense-fixture.js';

export const crossTripOperations = {
  讀成員: { method: 'GET', resource: 'members', child: 'member' },
  改成員: { method: 'PATCH', resource: 'members', child: 'member', data: { name: 'Renamed Amy' } },
  刪成員: { method: 'DELETE', resource: 'members', child: 'member' },
  讀支出: { method: 'GET', resource: 'expenses', child: 'expense' },
  改支出: {
    method: 'PATCH',
    resource: 'expenses',
    child: 'expense',
    data: { item: 'Updated snack' },
  },
  刪支出: { method: 'DELETE', resource: 'expenses', child: 'expense' },
  讀還款: { method: 'GET', resource: 'repayments', child: 'repayment' },
  讀結清: { method: 'GET', resource: 'settlements', child: 'settlement' },
} as const;

export function crossTripChildRequest(
  fixture: Pick<CrossTripSplittingFixture, 'currentTripId' | 'childIds'>,
  owner: Identity,
  origin: string,
  operation: string,
) {
  expect(Object.hasOwn(crossTripOperations, operation), 'Operation must match the DSL enum').toBe(
    true,
  );
  const command = crossTripOperations[operation as keyof typeof crossTripOperations];
  const write = command.method !== 'GET';

  return {
    url: `/api/trips/${fixture.currentTripId}/${command.resource}/${fixture.childIds[command.child]}`,
    options: {
      method: command.method,
      headers: { Cookie: owner.cookie, ...(write ? { Origin: origin } : {}) },
      ...('data' in command ? { data: command.data } : {}),
    },
  };
}

export async function requestCrossTripChild(world: LedgerWorld, operation: string): Promise<void> {
  const fixture = world.get<CrossTripSplittingFixture>(crossTripFixtureKey);
  const owner = world.users.get('甲');
  expect(owner, 'The current trip owner must retain a valid session').toBeDefined();
  const request = crossTripChildRequest(fixture, owner!, world.get<string>('webOrigin'), operation);
  const currentBefore = await snapshotSplittingSources(world, fixture.currentTripId);
  const otherBefore = await snapshotSplittingSources(fixture.otherWorld, fixture.otherTripId);
  world.set(crossTripFixtureKey, { ...fixture, currentBefore, otherBefore });
  world.splitting.snapshot = currentBefore;
  world.set('splitting:requestOwnerId', owner!.id);
  world.set('splitting:crossTripOperation', operation);
  world.response = await world.api.fetch(request.url, request.options);
}
