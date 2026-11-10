import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from './harness.js';
import { seedSplittingMembers, splittingMemberId } from './members-fixture.js';
import {
  fixedOwnerMemberPhrase,
  fixedOwnerMemberRequest,
  requestFixedOwnerMemberMutation,
} from './fixed-owner-member-command.js';
import { assertRejectedSplittingOperation } from './rejection.js';

test('T044 registers one parameter and selects only the requested owner mutation', () => {
  expect(fixedOwnerMemberPhrase).toBe('owner 嘗試對自己的固定成員執行 {string}');
  expect(fixedOwnerMemberRequest('改名')).toEqual({
    method: 'PATCH',
    data: { name: '新的名稱' },
  });
  expect(fixedOwnerMemberRequest('停用')).toEqual({ method: 'PATCH', data: { isActive: false } });
  expect(fixedOwnerMemberRequest('刪除')).toEqual({ method: 'DELETE' });
  expect(() => fixedOwnerMemberRequest('啟用')).toThrow('Unsupported fixed owner member operation');
});

for (const operation of ['改名', '停用', '刪除']) {
  test(`T044 isolated ${operation} uses the stable owner member and preserves all sources`, async ({
    world,
  }) => {
    await seedSplittingMembers(world);
    await runIsolatedStep(
      {
        phrase: fixedOwnerMemberPhrase,
        input: operation,
        execute: requestFixedOwnerMemberMutation,
      },
      world,
    );
    expect(world.get('splitting:memberId')).toBe(splittingMemberId(world, 'Alice'));
    expect(world.get('splitting:before')).toEqual(world.splitting.snapshot);
    expect(await world.response!.json()).toEqual(world.get('splitting:reply'));
    await assertRejectedSplittingOperation(world, 'VALIDATION_ERROR');
  });
}
