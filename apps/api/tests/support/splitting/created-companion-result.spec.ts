import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from './harness.js';
import { seedSplittingMembers } from './members-fixture.js';
import { createCompanion } from './create-member-command.js';
import {
  assertCreatedCompanion,
  assertCreatedCompanionSources,
  createdCompanionResultPhrase,
} from './created-companion-result.js';
import type { SourceSnapshot } from './types.js';

test('T075 signature and persisted member invariants reject incorrect results', () => {
  expect(createdCompanionResultPhrase).toBe('新增同行者以名稱 {string} 保存');
  expect(createdCompanionResultPhrase.match(/\{string\}/g)).toHaveLength(1);
  const before: SourceSnapshot = {
    trips: [{ id: 'trip', accounting_revision: '0' }],
    members: [{ id: 'owner', role: 'owner' }],
    expenses: [],
    shares: [],
    repayments: [],
    settlements: [],
    adjustments: [],
  };
  const member = {
    id: 'new',
    trip_id: 'trip',
    owner_id: 'account',
    name: 'DaVid',
    name_key: 'david',
    role: 'companion',
    is_active: true,
  };
  const after = {
    ...before,
    trips: [{ id: 'trip', accounting_revision: '1' }],
    members: [...before.members, member],
  };
  const expected = { id: 'new', tripId: 'trip', ownerId: 'account', name: 'DaVid' };
  expect(() => assertCreatedCompanionSources(before, after, expected)).not.toThrow();
  for (const patch of [
    { name: ' DaVid ' },
    { name_key: 'DaVid' },
    { trip_id: 'foreign' },
    { owner_id: 'foreign' },
    { role: 'owner' },
    { is_active: false },
    { id: 'wrong' },
  ])
    expect(() =>
      assertCreatedCompanionSources(
        before,
        {
          ...after,
          members: [...before.members, { ...member, ...patch }],
        },
        expected,
      ),
    ).toThrow();
  expect(() =>
    assertCreatedCompanionSources(
      before,
      {
        ...after,
        trips: before.trips,
      },
      expected,
    ),
  ).toThrow();
  expect(() =>
    assertCreatedCompanionSources(
      before,
      {
        ...after,
        expenses: [{ id: 'unexpected' }],
      },
      expected,
    ),
  ).toThrow();
});

test('T075 isolated creation Then confirms trimmed persistence, revision, reads and access', async ({
  world,
}) => {
  await seedSplittingMembers(world);
  await createCompanion(world, '  DaVid  ');
  await runIsolatedStep(
    {
      phrase: createdCompanionResultPhrase,
      input: 'DaVid',
      execute: assertCreatedCompanion,
    },
    world,
  );
});
