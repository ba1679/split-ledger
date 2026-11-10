import { test, expect } from '../fixtures.js';
import { seedUnauthorizedSplittingAccount } from './access-fixture.js';
import { runIsolatedStep } from './harness.js';
import {
  unauthorizedOperations,
  requestUnauthorizedSplittingResource,
} from './unauthorized-operation.js';
import {
  assertOpaqueNotFound,
  assertUnauthorizedSplittingRejection,
} from './unauthorized-rejection.js';

test('T060 compares nonexistent resource errors and rejects private payloads', () => {
  const missing = { code: 'NOT_FOUND', message: 'Resource not found' };
  expect(() => assertOpaqueNotFound(missing, missing)).not.toThrow();
  expect(() =>
    assertOpaqueNotFound(
      { ...missing, requestId: 'request-one' },
      { ...missing, requestId: 'request-two' },
    ),
  ).not.toThrow();
  expect(() => assertOpaqueNotFound({ ...missing, requestId: 42 }, missing)).toThrow();
  expect(() =>
    assertOpaqueNotFound({ ...missing, members: [] }, { ...missing, members: [] }),
  ).toThrow();
  expect(() => assertOpaqueNotFound({ ...missing, members: [] }, missing)).toThrow();
  expect(() =>
    assertOpaqueNotFound({ ...missing, message: 'Alice trip exists' }, missing),
  ).toThrow();
});

for (const operation of unauthorizedOperations) {
  test(`T060 isolated Then verifies forbidden ${operation}`, async ({ world }) => {
    await seedUnauthorizedSplittingAccount(world);
    await requestUnauthorizedSplittingResource(world, operation);
    await runIsolatedStep(
      {
        phrase: '分帳資源拒絕存取且不揭露帳務',
        input: undefined,
        execute: assertUnauthorizedSplittingRejection,
      },
      world,
    );
  });
}
