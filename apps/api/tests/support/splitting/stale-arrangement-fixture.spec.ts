import { test, expect } from '../fixtures.js';
import {
  captureCurrentAmyArrangement,
  type PendingSettlementSnapshot,
} from './current-arrangement-fixture.js';
import { seedSplittingExpenses } from './expense-fixture.js';
import { runIsolatedStep } from './harness.js';
import { seedExpenseAfterArrangement } from './stale-arrangement-fixture.js';
import type { SourceSnapshot } from './types.js';

test('T026 isolated Given preserves the old command after a committed JPY10 expense', async ({
  world,
}) => {
  await seedSplittingExpenses(world, [
    { 項目: '點心', 幣別: 'JPY', 金額: '100', 付款人: 'Alice', 分攤者: 'Alice、Amy、Bob' },
  ]);
  await captureCurrentAmyArrangement(world);
  const command = structuredClone(
    world.get<PendingSettlementSnapshot>('splitting:settlementSnapshot'),
  );
  await runIsolatedStep(
    {
      phrase: '舊付款安排取得後帳本已有新的支出',
      input: undefined,
      execute: seedExpenseAfterArrangement,
    },
    world,
  );
  expect(world.get('splitting:settlementSnapshot')).toEqual(command);
  const beforeFailure = world.get<SourceSnapshot>('splitting:before');
  expect(String(beforeFailure.trips[0]!.accounting_revision)).toBe(
    (BigInt(command.accountingRevision) + 1n).toString(),
  );
  expect(beforeFailure.expenses).toHaveLength(2);
  expect(beforeFailure.shares).toHaveLength(4);
});
