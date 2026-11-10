import { test, expect } from '../fixtures.js';
import { seedSplittingExpenses, snapshotSplittingSources } from './expense-fixture.js';
import { runIsolatedStep } from './harness.js';
import { seedSimplificationMode, snapshotExactBalances } from './simplification-mode-fixture.js';

for (const mode of ['開啟', '關閉'] as const) {
  test(`T024 isolated Given preserves sources and exact balances for ${mode}`, async ({
    world,
  }) => {
    await seedSplittingExpenses(world, [
      { 項目: '點心', 幣別: 'JPY', 金額: '100', 付款人: 'Alice', 分攤者: 'Alice、Amy、Bob' },
    ]);
    const before = await snapshotSplittingSources(world);
    await runIsolatedStep(
      {
        phrase: '旅行的簡化付款已為 {string}',
        input: mode,
        execute: seedSimplificationMode,
      },
      world,
    );
    const after = await snapshotSplittingSources(world);
    expect(after).toEqual({
      ...before,
      trips: before.trips.map((trip) => ({ ...trip, simplify_debts: mode === '開啟' })),
    });
    expect(world.get('splitting:before')).toEqual(after);
    expect(world.get('splitting:sourceSnapshot')).toEqual(after);
    expect(world.get('splitting:simplifyDebts')).toBe(mode === '開啟');
    expect(world.get('splitting:revision')).toBe(String(after.trips[0]!.accounting_revision));
    expect(world.get('splitting:balanceSnapshot')).toEqual(snapshotExactBalances(before));
    expect(snapshotExactBalances(after)).toEqual(snapshotExactBalances(before));
  });
}

test('T024 rejects an unsupported mode before touching the database', async ({ world }) => {
  await expect(seedSimplificationMode(world, '其他')).rejects.toThrow(
    'Simplification fixture mode must be 開啟 or 關閉',
  );
});
