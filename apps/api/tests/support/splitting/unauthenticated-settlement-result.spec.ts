import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from './harness.js';
import { seedSplittingMembers } from './members-fixture.js';
import { requestUnauthenticatedSettlement } from './unauthenticated-settlement.js';
import {
  assertUnauthenticatedSettlementBody,
  assertUnauthenticatedSettlementResult,
  unauthenticatedSettlementResultPhrase,
} from './unauthenticated-settlement-result.js';

test('T059 exact parameter-free phrase rejects nested accounting disclosures', () => {
  expect(unauthenticatedSettlementResultPhrase).toBe('分帳結算回覆未登入且不揭露帳務');
  expect(unauthenticatedSettlementResultPhrase).not.toMatch(/[{}]/);
  expect(() => assertUnauthenticatedSettlementBody({ code: 'UNAUTHENTICATED' })).not.toThrow();
  for (const key of ['members', 'balances', 'arrangements', 'email', 'accessToken'])
    expect(() =>
      assertUnauthenticatedSettlementBody({ code: 'UNAUTHENTICATED', details: { [key]: [] } }),
    ).toThrow();
});

test('T059 isolated Then verifies 401, privacy, unchanged owner reads and companion non-authentication', async ({
  world,
}) => {
  await seedSplittingMembers(world);
  await requestUnauthenticatedSettlement(world);
  await runIsolatedStep(
    {
      phrase: unauthenticatedSettlementResultPhrase,
      input: undefined,
      execute: assertUnauthenticatedSettlementResult,
    },
    world,
  );
});
