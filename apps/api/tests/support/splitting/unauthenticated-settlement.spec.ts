import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from './harness.js';
import { seedSplittingMembers } from './members-fixture.js';
import { snapshotSplittingSources } from './expense-fixture.js';
import {
  requestUnauthenticatedSettlement,
  unauthenticatedSettlementPhrase,
} from './unauthenticated-settlement.js';

test('T028 registers the exact parameter-free authority phrase', () => {
  expect(unauthenticatedSettlementPhrase).toBe('未登入者嘗試讀取分帳結算');
  expect(unauthenticatedSettlementPhrase).not.toMatch(/[{}]/);
});

test('T028 isolated When uses the cookie-free API context and records its single settlement read', async ({
  world,
}) => {
  await seedSplittingMembers(world);
  const before = await snapshotSplittingSources(world);
  expect(unauthenticatedSettlementPhrase).toBe('未登入者嘗試讀取分帳結算');
  await runIsolatedStep(
    {
      phrase: unauthenticatedSettlementPhrase,
      input: undefined,
      execute: requestUnauthenticatedSettlement,
    },
    world,
  );
  expect(world.response).toBeDefined();
  expect(world.response!.status()).toBe(401);
  expect(await world.response!.json()).toMatchObject({ code: 'UNAUTHENTICATED' });
  expect(world.get('splitting:requestOwnerId')).toBeNull();
  expect(world.splitting.snapshot).toEqual(before);
  expect(await snapshotSplittingSources(world)).toEqual(before);
});
