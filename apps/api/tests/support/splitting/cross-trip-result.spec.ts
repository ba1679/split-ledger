import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from './harness.js';
import { seedCrossTripSplittingResources } from './cross-trip-fixture.js';
import { requestCrossTripChild, crossTripOperations } from './cross-trip-operation.js';
import {
  assertCrossTripError,
  assertCrossTripResult,
  crossTripResultPhrase,
} from './cross-trip-result.js';
import type { SourceSnapshot } from './types.js';

test('T061 parameter-free phrase and error identity reject source disclosure', () => {
  expect(crossTripResultPhrase).toBe('跨旅行子資源存取被拒絕且來源不變');
  expect(crossTripResultPhrase).not.toMatch(/[{}]/);
  const source: SourceSnapshot = {
    trips: [{ id: 'trip-secret', name: '台南旅行' }],
    members: [],
    expenses: [],
    shares: [],
    repayments: [],
    settlements: [],
    adjustments: [],
  };
  const error = { code: 'NOT_FOUND', message: '找不到資料' };
  expect(() => assertCrossTripError(error, error, source)).not.toThrow();
  expect(() =>
    assertCrossTripError(
      { ...error, requestId: 'request-a' },
      { ...error, requestId: 'request-b' },
      source,
    ),
  ).not.toThrow();
  expect(() =>
    assertCrossTripError(
      { ...error, requestId: 'trip-secret' },
      { ...error, requestId: 'request-b' },
      source,
    ),
  ).toThrow();
  expect(() => assertCrossTripError({ ...error, message: '台南旅行' }, error, source)).toThrow();
  expect(() =>
    assertCrossTripError({ ...error, amount: '1000' }, { ...error, amount: '1000' }, source),
  ).toThrow();
});

for (const operation of Object.keys(crossTripOperations))
  test(`T061 isolated Then ${operation} verifies both source snapshots and correct-trip child reads`, async ({
    world,
  }) => {
    await seedCrossTripSplittingResources(world);
    await requestCrossTripChild(world, operation);
    await runIsolatedStep(
      { phrase: crossTripResultPhrase, input: undefined, execute: assertCrossTripResult },
      world,
    );
  });
