import { test, expect } from '../fixtures.js';
import {
  captureCurrentAmyArrangement,
  type PendingSettlementSnapshot,
} from './current-arrangement-fixture.js';
import { seedSplittingExpenses } from './expense-fixture.js';
import { runIsolatedStep } from './harness.js';
import type { SourceSnapshot } from './types.js';

test('T022 isolated Given retains the raw 100/3 snapshot and reserves unwritten IDs', async ({
  world,
}) => {
  await seedSplittingExpenses(world, [
    { 項目: '點心', 幣別: 'JPY', 金額: '100', 付款人: 'Alice', 分攤者: 'Alice、Amy、Bob' },
  ]);
  await runIsolatedStep(
    {
      phrase: 'owner 已取得 Amy 向 Alice 的目前付款安排',
      input: undefined,
      execute: captureCurrentAmyArrangement,
    },
    world,
  );
  const pending = world.get<PendingSettlementSnapshot>('splitting:settlementSnapshot');
  expect(pending.expectedAmount).toEqual({ numerator: '100', denominator: '3', minorUnit: 0 });
  expect(pending.id).toBe(world.splitting.ids.settlements.get('pending'));
  expect(pending.repaymentId).toBe(world.splitting.ids.repayments.get('pending:settlement'));
  expect(pending.id).not.toBe(pending.repaymentId);
  expect(pending).not.toHaveProperty('paidAmount');
  const before = world.get<SourceSnapshot>('splitting:before');
  expect(before.repayments).toEqual([]);
  expect(before.settlements).toEqual([]);
  expect(before.adjustments).toEqual([]);
});
