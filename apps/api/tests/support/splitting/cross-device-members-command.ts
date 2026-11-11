import { request, expect, type APIRequestContext } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import { seedSession } from '../seed.js';
import { snapshotSplittingSources } from './expense-fixture.js';
import { splittingTripId } from './members-fixture.js';

export const crossDeviceMembersPhrase = 'owner 以另一裝置工作階段讀取旅行成員';
const contextKey = 'splitting:otherDeviceApi';

export async function disposeOtherDeviceApi(world: LedgerWorld): Promise<void> {
  const context = world.state.get(contextKey) as APIRequestContext | undefined;
  if (context) {
    world.state.delete(contextKey);
    await context.dispose();
  }
}

/** A new valid session and request context for the same user, with one product GET. */
export async function readMembersOnAnotherDevice(world: LedgerWorld): Promise<void> {
  const owner = world.users.get('甲');
  expect(owner, 'The members fixture must establish the owner').toBeDefined();
  const before = await snapshotSplittingSources(world);
  const session = await seedSession(world, '甲');
  expect(session.id).toBe(owner!.id);
  expect(session.cookie).not.toBe(owner!.cookie);
  const context = await request.newContext({
    baseURL: world.origin,
    extraHTTPHeaders: { Cookie: session.cookie },
  });
  world.set(contextKey, context);
  world.set('splitting:otherDeviceSession', session);
  world.set('splitting:requestOwnerId', session.id);
  world.set('splitting:before', before);
  world.response = await context.get(`/api/trips/${splittingTripId(world)}/members`);
  world.set('splitting:reply', await world.response.json());
  expect(await snapshotSplittingSources(world)).toEqual(before);
  world.splitting.snapshot = before;
}
