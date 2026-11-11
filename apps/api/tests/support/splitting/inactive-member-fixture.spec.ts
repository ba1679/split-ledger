import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from './harness.js';
import { seedSplittingExpenses } from './expense-fixture.js';
import { deactivateSplittingMember } from './inactive-member-fixture.js';
import type { SourceSnapshot } from './types.js';

for (const name of ['Amy', 'Bob']) {
  test(`T016: isolated inactivity preserves ${name}'s stable identity and historical shares`, async ({
    world,
  }) => {
    await seedSplittingExpenses(world, [
      { 項目: '點心', 付款人: 'Alice', 幣別: 'JPY', 金額: '100', 分攤者: 'Alice、Amy、Bob' },
    ]);
    await runIsolatedStep(
      {
        phrase: `同行者 "${name}" 已停用`,
        input: name,
        execute: deactivateSplittingMember,
      },
      world,
    );
    const before = world.get<SourceSnapshot>('splitting:memberStateBefore');
    const after = world.get<SourceSnapshot>('splitting:memberStateAfter');
    const id = world.splitting.ids.members.get(name)!;
    expect(before.shares.some((row) => row.member_id === id)).toBe(true);
    expect(after.shares).toEqual(before.shares);
    expect(after.members.find((row) => row.id === id)?.is_active).toBe(false);
    expect(world.get(`splitting:inactiveMember:${name}`)).toMatchObject({ memberId: id });
  });
}
