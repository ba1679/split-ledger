import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from './harness.js';
import { seedSplittingMembers, splittingMemberId, splittingTripId } from './members-fixture.js';
import { test as pureTest } from '@playwright/test';

pureTest('T006: owner alias resolves the fixed Alice identity without a database', () => {
  const world = {
    splitting: {
      namespace: 'alias-test',
      ids: {
        trips: new Map<string, string>(),
        members: new Map([
          ['Alice', 'fixed-owner-id'],
          ['Amy', 'amy-id'],
        ]),
        expenses: new Map<string, string>(),
        repayments: new Map<string, string>(),
        settlements: new Map<string, string>(),
      },
    },
  };

  expect(splittingMemberId(world, 'owner')).toBe('fixed-owner-id');
  expect(splittingMemberId(world, 'Alice')).toBe('fixed-owner-id');
  expect(splittingMemberId(world, 'Amy')).toBe('amy-id');
  expect(() => splittingMemberId(world, 'unknown')).toThrow('must establish unknown');
});

test('T006: isolated authoritative member Given establishes persisted stable identities', async ({
  world,
}) => {
  await runIsolatedStep(
    {
      phrase: 'owner 的分帳旅行已建立成員',
      input: undefined,
      execute: seedSplittingMembers,
    },
    world,
  );

  expect(splittingTripId(world)).toBe(world.get('backend:tripId'));
  expect(
    new Set(['Alice', 'Amy', 'Bob', 'Carol'].map((name) => splittingMemberId(world, name))).size,
  ).toBe(4);
  expect(world.get('splitting:initialRevision')).toBe('0');
  const identities = await world.db.query('SELECT id,name FROM auth."user" WHERE id LIKE $1', [
    `${world.namespace}%`,
  ]);

  expect(identities.rows).toEqual([{ id: world.users.get('甲')!.id, name: 'Alice' }]);
});
