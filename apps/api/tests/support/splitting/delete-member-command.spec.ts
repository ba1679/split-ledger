import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from './harness.js';
import { deleteCompanion, deleteMemberPhrase } from './delete-member-command.js';
import { seedSplittingMembers, splittingMemberId } from './members-fixture.js';
import { seedSplittingExpenses, snapshotSplittingSources } from './expense-fixture.js';
import { assertRejectedSplittingOperation } from './rejection.js';
import type { SourceSnapshot } from './types.js';

test('T043 registers the exact single-string deletion sentence', () => {
  expect(deleteMemberPhrase).toBe('owner 刪除同行者 {string}');
  expect(deleteMemberPhrase.match(/\{string\}/g)).toHaveLength(1);
});

test('T043 isolated unused companion deletion records stable target and bodyless response', async ({
  world,
}) => {
  await seedSplittingMembers(world);
  const memberId = splittingMemberId(world, 'Carol');
  await runIsolatedStep(
    { phrase: deleteMemberPhrase, input: 'Carol', execute: deleteCompanion },
    world,
  );
  expect(world.get('splitting:memberId')).toBe(memberId);
  expect(world.response!.status(), 'Product must allow unused companion deletion').toBe(204);
  expect(world.get('splitting:replyText')).toBe('');
  const before = world.get<SourceSnapshot>('splitting:before');
  const after = await snapshotSplittingSources(world);
  expect(after.members).toEqual(before.members.filter((member) => member.id !== memberId));
  for (const key of ['expenses', 'shares', 'repayments', 'settlements', 'adjustments'] as const)
    expect(after[key]).toEqual(before[key]);
});

test('T043 isolated referenced companion deletion preserves source references', async ({
  world,
}) => {
  await seedSplittingExpenses(world, [
    { 項目: '車票', 幣別: 'JPY', 金額: '60', 付款人: 'Alice', 分攤者: 'Amy' },
  ]);
  await runIsolatedStep(
    { phrase: deleteMemberPhrase, input: 'Amy', execute: deleteCompanion },
    world,
  );
  expect(world.get('splitting:memberId')).toBe(splittingMemberId(world, 'Amy'));
  await assertRejectedSplittingOperation(world, 'MEMBER_IN_USE');
});
