import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from './harness.js';
import { seedCrossTripSplittingResources } from './cross-trip-fixture.js';
import {
  crossTripChildRequest,
  crossTripOperations,
  requestCrossTripChild,
} from './cross-trip-operation.js';

const fixture = {
  currentTripId: 'japan-trip',
  childIds: {
    member: 'tainan-member',
    expense: 'tainan-expense',
    repayment: 'tainan-repayment',
    settlement: 'tainan-settlement',
  },
};
const owner = { id: 'owner', name: 'Alice', email: 'alice@example.test', cookie: 'owner-session' };

test('T027 enum dispatch keeps the current trip path and foreign child for all eight operations', () => {
  const cases = [
    ['讀成員', 'GET', 'members/tainan-member', undefined],
    ['改成員', 'PATCH', 'members/tainan-member', { name: 'Renamed Amy' }],
    ['刪成員', 'DELETE', 'members/tainan-member', undefined],
    ['讀支出', 'GET', 'expenses/tainan-expense', undefined],
    ['改支出', 'PATCH', 'expenses/tainan-expense', { item: 'Updated snack' }],
    ['刪支出', 'DELETE', 'expenses/tainan-expense', undefined],
    ['讀還款', 'GET', 'repayments/tainan-repayment', undefined],
    ['讀結清', 'GET', 'settlements/tainan-settlement', undefined],
  ] as const;
  expect(Object.keys(crossTripOperations)).toEqual(cases.map(([operation]) => operation));
  for (const [operation, method, childPath, data] of cases) {
    const request = crossTripChildRequest(fixture, owner, 'https://trusted.test', operation);
    expect(request.url).toBe(`/api/trips/japan-trip/${childPath}`);
    expect(request.options).toEqual({
      method,
      headers: {
        Cookie: owner.cookie,
        ...(method === 'GET' ? {} : { Origin: 'https://trusted.test' }),
      },
      ...(data ? { data } : {}),
    });
  }
  expect(() => crossTripChildRequest(fixture, owner, 'https://trusted.test', 'unknown')).toThrow();
});

test('T027 isolated When sends one authenticated cross-trip request and records the real reply', async ({
  world,
}) => {
  await seedCrossTripSplittingResources(world);
  await runIsolatedStep(
    {
      phrase: 'owner 以目前旅行路徑 "讀成員" 另一旅行子資源',
      input: '讀成員',
      execute: requestCrossTripChild,
    },
    world,
  );
  expect(world.response).toBeDefined();
  expect(world.response!.status()).toBe(404);
  expect(await world.response!.json()).toMatchObject({ code: 'NOT_FOUND' });
  expect(world.splitting.snapshot).toBeDefined();
});
