import { test, expect } from '../fixtures.js';
import { login, createTrip } from '../backend.js';
import { runIsolatedStep } from './harness.js';
import {
  assertNewTripOwner,
  assertNewTripOwnerProjection,
  newTripOwnerResultPhrase,
} from './new-trip-owner-result.js';

test('T103 fixed owner projection rejects missing, duplicate and mismatched identities', () => {
  expect(newTripOwnerResultPhrase).toBe('新旅行同時具有唯一固定 owner 成員');
  const trip = {
    id: 'trip',
    ownerMemberId: 'd717092d-5b0d-4efc-82b0-a67e102e46f3',
    simplifyDebts: false,
    accountingRevision: '0',
  };
  const member = {
    id: trip.ownerMemberId,
    tripId: 'trip',
    role: 'owner',
    isActive: true,
    name: '甲',
  };
  const expected = { tripId: 'trip', accountName: '甲' };
  expect(() => assertNewTripOwnerProjection(trip, [member], expected)).not.toThrow();
  for (const patch of [
    { ownerMemberId: undefined },
    { ownerMemberId: 'auth-account' },
    { simplifyDebts: true },
    { accountingRevision: -1 },
    { accountingRevision: '-1' },
    { accountingRevision: '1.5' },
    { accountingRevision: '01' },
  ])
    expect(() => assertNewTripOwnerProjection({ ...trip, ...patch }, [member], expected)).toThrow();
  for (const patch of [
    { id: 'other' },
    { tripId: 'other' },
    { name: 'Amy' },
    { role: 'companion' },
    { isActive: false },
  ])
    expect(() => assertNewTripOwnerProjection(trip, [{ ...member, ...patch }], expected)).toThrow();
  expect(() => assertNewTripOwnerProjection(trip, [], expected)).toThrow();
  expect(() => assertNewTripOwnerProjection(trip, [member, member], expected)).toThrow();
});

test('T103 isolated Then verifies POST already created the unique fixed owner', async ({
  world,
}) => {
  await login(world);
  await createTrip(world, '日本旅行');
  await runIsolatedStep(
    { phrase: newTripOwnerResultPhrase, input: undefined, execute: assertNewTripOwner },
    world,
  );
});
