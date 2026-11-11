import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from './harness.js';
import {
  changeCompanionStatus,
  memberStatusInput,
  memberStatusPhrase,
} from './member-status-command.js';
import { seedSplittingExpenses, snapshotSplittingSources } from './expense-fixture.js';
import { splittingMemberId } from './members-fixture.js';
import { deactivateSplittingMember } from './inactive-member-fixture.js';
import type { SourceSnapshot } from './types.js';

test('T046 registers two strings and explicitly maps both allowed statuses', () => {
  expect(memberStatusPhrase).toBe('owner 將同行者 {string} 設為 {string}');
  expect(memberStatusPhrase.match(/\{string\}/g)).toHaveLength(2);
  expect(memberStatusInput('停用')).toBe(false);
  expect(memberStatusInput('啟用')).toBe(true);
  expect(() => memberStatusInput('未知')).toThrow('Unsupported companion status');
});

for (const status of ['停用', '啟用']) {
  test(`T046 isolated ${status} changes only the stable companion status`, async ({ world }) => {
    await seedSplittingExpenses(world, [
      { 項目: '車票', 幣別: 'JPY', 金額: '60', 付款人: 'Alice', 分攤者: 'Amy' },
    ]);
    if (status === '啟用') await deactivateSplittingMember(world, 'Amy');
    const memberId = splittingMemberId(world, 'Amy');
    await runIsolatedStep(
      {
        phrase: memberStatusPhrase,
        input: { name: 'Amy', status },
        execute: changeCompanionStatus,
      },
      world,
    );
    expect(world.response!.status(), 'Product must accept companion status changes').toBe(200);
    expect(world.get('splitting:memberId')).toBe(memberId);
    expect(world.get('splitting:memberIsActive')).toBe(status === '啟用');
    const before = world.get<SourceSnapshot>('splitting:before');
    const after = await snapshotSplittingSources(world);
    expect(after.members).toEqual(
      before.members.map((member) =>
        member.id === memberId
          ? expect.objectContaining({
              ...member,
              is_active: status === '啟用',
              updated_at: expect.anything(),
            })
          : member,
      ),
    );
    for (const key of ['expenses', 'shares', 'repayments', 'settlements', 'adjustments'] as const)
      expect(after[key]).toEqual(before[key]);
  });
}
