import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from './harness.js';
import { renameCompanion, renameMemberPhrase } from './rename-member-command.js';
import { seedSplittingMembers, splittingMemberId } from './members-fixture.js';
import { snapshotSplittingSources } from './expense-fixture.js';
import { assertRejectedSplittingOperation } from './rejection.js';
import type { SourceSnapshot } from './types.js';

test('T045 registers the exact two-string rename sentence', () => {
  expect(renameMemberPhrase).toBe('owner 將同行者 {string} 改名為 {string}');
  expect(renameMemberPhrase.match(/\{string\}/g)).toHaveLength(2);
});

test('T045 isolated rename preserves the original identity and sends the raw new name', async ({
  world,
}) => {
  await seedSplittingMembers(world);
  const memberId = splittingMemberId(world, 'Amy');
  await runIsolatedStep(
    { phrase: renameMemberPhrase, input: ['Amy', '  Amelia  '] as const, execute: renameCompanion },
    world,
  );
  expect(world.response!.status(), 'Product must support owner member rename').toBe(200);
  expect(world.get('splitting:memberRequest')).toEqual({ name: '  Amelia  ' });
  expect(world.get('splitting:reply')).toMatchObject({ id: memberId, name: 'Amelia' });
  expect(splittingMemberId(world, 'Amelia')).toBe(memberId);
  expect(splittingMemberId(world, 'Amy')).toBe(memberId);
  const before = world.get<SourceSnapshot>('splitting:before');
  const after = await snapshotSplittingSources(world);
  expect(after.members.find((row) => row.id === memberId)).toMatchObject({
    id: memberId,
    role: 'companion',
    name: 'Amelia',
    name_key: 'amelia',
  });
  for (const key of ['expenses', 'shares', 'repayments', 'settlements', 'adjustments'] as const)
    expect(after[key]).toEqual(before[key]);
});

test('T045 isolated conflicting rename leaves sources and aliases unchanged', async ({ world }) => {
  await seedSplittingMembers(world);
  const originalId = splittingMemberId(world, 'Amy');
  const occupiedId = splittingMemberId(world, 'Bob');
  await runIsolatedStep(
    { phrase: renameMemberPhrase, input: ['Amy', 'Bob'] as const, execute: renameCompanion },
    world,
  );
  await assertRejectedSplittingOperation(world, 'MEMBER_NAME_CONFLICT');
  expect(splittingMemberId(world, 'Amy')).toBe(originalId);
  expect(splittingMemberId(world, 'Bob')).toBe(occupiedId);
});
