import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from './harness.js';
import { seedSplittingMembers } from './members-fixture.js';
import { deleteCompanion } from './delete-member-command.js';
import {
  assertDeletedCompanion,
  assertOnlyCompanionRemoved,
  deletedMemberResultPhrase,
} from './deleted-member-result.js';
import type { SourceSnapshot } from './types.js';

test('T072 single member parameter and source preservation reject deletion side effects', () => {
  expect(deletedMemberResultPhrase).toBe('同行者 {string} 已從旅行移除');
  expect(deletedMemberResultPhrase.match(/\{string\}/g)).toHaveLength(1);
  const before: SourceSnapshot = {
    trips: [{ id: 'trip', accounting_revision: '7', name: 'trip' }],
    members: [
      { id: 'owner', role: 'owner' },
      { id: 'Carol', role: 'companion' },
    ],
    expenses: [{ id: 'expense' }],
    shares: [{ expense_id: 'expense' }],
    repayments: [{ id: 'repayment' }],
    settlements: [{ id: 'settlement' }],
    adjustments: [{ id: 'adjustment' }],
  };
  const after = {
    ...before,
    trips: [{ ...before.trips[0], accounting_revision: '8' }],
    members: before.members.filter((member) => member.id !== 'Carol'),
  };
  expect(() => assertOnlyCompanionRemoved(before, after, 'Carol')).not.toThrow();
  expect(() => assertOnlyCompanionRemoved(before, before, 'Carol')).toThrow();
  expect(() => assertOnlyCompanionRemoved(before, { ...after, members: [] }, 'Carol')).toThrow();
  expect(() =>
    assertOnlyCompanionRemoved(before, { ...after, trips: before.trips }, 'Carol'),
  ).toThrow();
  for (const key of ['expenses', 'shares', 'repayments', 'settlements', 'adjustments'] as const)
    expect(() => assertOnlyCompanionRemoved(before, { ...after, [key]: [] }, 'Carol')).toThrow();
});

test('T072 isolated deleted companion Then checks DB, GETs, history and revision', async ({
  world,
}) => {
  await seedSplittingMembers(world);
  await deleteCompanion(world, 'Carol');
  await runIsolatedStep(
    { phrase: deletedMemberResultPhrase, input: 'Carol', execute: assertDeletedCompanion },
    world,
  );
});
