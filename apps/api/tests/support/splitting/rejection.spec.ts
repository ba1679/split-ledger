import { test, expect } from '../fixtures.js';
import { seedSplittingMembers, splittingTripId } from './members-fixture.js';
import { runIsolatedStep } from './harness.js';
import {
  assertRejectedSplittingOperation,
  assertNoSplittingErrorDisclosure,
  assertSplittingRejectionCode,
  captureSplittingRejectionBaseline,
  splittingRejectionStatus,
} from './rejection.js';

test('T009 parameters include exactly the eight contract errors and reject unknown errors', () => {
  expect(splittingRejectionStatus).toEqual({
    VALIDATION_ERROR: 400,
    UNAUTHENTICATED: 401,
    NOT_FOUND: 404,
    MEMBER_NAME_CONFLICT: 409,
    MEMBER_IN_USE: 409,
    ACCOUNTING_REVISION_CONFLICT: 409,
    ARRANGEMENT_NOT_FOUND: 409,
    ID_CONFLICT: 409,
  });
  for (const code of Object.keys(splittingRejectionStatus)) assertSplittingRejectionCode(code);
  expect(() => assertSplittingRejectionCode('INTERNAL_ERROR')).toThrow();
});

test('T009 isolated rejection checks a real refused command and authoritative unchanged source', async ({
  world,
}) => {
  await seedSplittingMembers(world);
  await captureSplittingRejectionBaseline(world);
  world.response = await world.api.post(`/api/trips/${splittingTripId(world)}/members`, {
    headers: { Cookie: world.users.get('甲')!.cookie, Origin: world.get<string>('webOrigin') },
    data: { id: 'not-a-uuid', name: 'Dave' },
  });
  await runIsolatedStep(
    {
      phrase: '這次分帳操作被拒絕為 "VALIDATION_ERROR"',
      input: 'VALIDATION_ERROR',
      execute: assertRejectedSplittingOperation,
    },
    world,
  );
});

test('T009 error explanations permit own data while protecting other owners and all sessions', () => {
  const source = {
    trips: [{ id: 'own-trip', owner_id: 'own', name: 'Alice' }],
    members: [],
    expenses: [
      {
        id: 'own-expense',
        owner_id: 'own',
        item: 'Snack',
        amount_minor: '100',
        minor_unit: 0,
        currency_code: 'JPY',
      },
    ],
    shares: [],
    repayments: [],
    settlements: [],
    adjustments: [],
  };
  const identities = [
    { id: 'own', name: 'Alice', email: 'alice@example.test', cookie: 'own-cookie-secret' },
    { id: 'foreign', name: 'David', email: 'david@example.test', cookie: 'foreign-cookie-secret' },
  ];
  expect(() =>
    assertNoSplittingErrorDisclosure({ message: 'Alice: JPY 100' }, source, identities, 'own'),
  ).not.toThrow();
  expect(() =>
    assertNoSplittingErrorDisclosure({ message: 'David' }, source, identities, 'own'),
  ).toThrow();
  expect(() =>
    assertNoSplittingErrorDisclosure({ message: 'own-cookie-secret' }, source, identities, 'own'),
  ).toThrow();
  expect(() =>
    assertNoSplittingErrorDisclosure({ message: 'Alice: JPY 100' }, source, identities, 'foreign'),
  ).toThrow();
});
