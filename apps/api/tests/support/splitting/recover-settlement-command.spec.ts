import type { LedgerWorld } from '../world.js';
import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from './harness.js';
import { seedLostSettlementResponse } from './lost-settlement-fixture.js';
import { recoverSavedSettlement, recoverSettlementPhrase } from './recover-settlement-command.js';

test('T057 registers one parameter-free GET with the reserved ID and owner session', async () => {
  expect(recoverSettlementPhrase).toBe('owner 查證先前已保存的結清紀錄');
  const calls: unknown[] = [];
  const reply = { id: 'reserved-settlement', repaymentId: 'original-repayment' };
  const state = new Map<string, unknown>([
    ['splitting:lostSettlementCommand', { id: 'reserved-settlement' }],
  ]);
  const world = {
    users: new Map([['甲', { cookie: 'owner-session' }]]),
    splitting: { ids: { trips: new Map([['日本旅行', 'trip-id']]) } },
    api: {
      get: async (...args: unknown[]) => {
        calls.push(args);
        return { json: async () => reply, status: () => 200 };
      },
    },
    get: (key: string) => state.get(key),
    set: (key: string, value: unknown) => state.set(key, value),
  } as unknown as LedgerWorld;
  await runIsolatedStep(
    { phrase: recoverSettlementPhrase, input: undefined, execute: recoverSavedSettlement },
    world,
  );
  expect(calls).toEqual([
    [
      '/api/trips/trip-id/settlements/reserved-settlement',
      { headers: { Cookie: 'owner-session' } },
    ],
  ]);
  expect(world.response).toBeDefined();
  expect(state.get('splitting:reply')).toEqual(reply);
});

test('T057 isolated recovery reads the already committed settlement', async ({ world }) => {
  await seedLostSettlementResponse(world);
  await runIsolatedStep(
    { phrase: recoverSettlementPhrase, input: undefined, execute: recoverSavedSettlement },
    world,
  );
  expect(world.response!.status()).toBe(200);
});
