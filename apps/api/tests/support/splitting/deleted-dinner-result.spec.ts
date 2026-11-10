import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from './harness.js';
import { seedSplittingExpenses } from './expense-fixture.js';
import { deleteSharedDinner } from './delete-dinner-command.js';
import {
  assertDeletedDinnerResult,
  assertDinnerRemoved,
  deletedDinnerResultPhrase,
} from './deleted-dinner-result.js';
import type { SourceSnapshot } from './types.js';

test('T066 parameter-free removal assertion rejects stale expense, shares and altered history', () => {
  expect(deletedDinnerResultPhrase).toBe('晚餐已不再影響帳本與結算');
  expect(deletedDinnerResultPhrase).not.toMatch(/[{}]/);
  const before: SourceSnapshot = {
    trips: [],
    members: [{ id: 'Amy' }],
    expenses: [{ id: 'dinner', item: '晚餐' }],
    shares: [{ expense_id: 'dinner', member_id: 'Amy' }],
    repayments: [{ id: 'repayment' }],
    settlements: [{ id: 'settlement' }],
    adjustments: [{ id: 'adjustment' }],
  };
  const after = { ...before, expenses: [], shares: [] };
  expect(() => assertDinnerRemoved(before, after, 'dinner')).not.toThrow();
  for (const key of ['expenses', 'shares'] as const)
    expect(() => assertDinnerRemoved(before, { ...after, [key]: before[key] }, 'dinner')).toThrow();
  for (const key of ['members', 'repayments', 'settlements', 'adjustments'] as const)
    expect(() => assertDinnerRemoved(before, { ...after, [key]: [] }, 'dinner')).toThrow();
});

test('T066 isolated deleted dinner Then checks authoritative deletion and rebuilt settlement', async ({
  world,
}) => {
  await seedSplittingExpenses(world, [
    { 項目: '晚餐', 幣別: 'JPY', 金額: '300', 付款人: 'Alice', 分攤者: 'Alice、Amy、Bob' },
  ]);
  await deleteSharedDinner(world);
  await runIsolatedStep(
    { phrase: deletedDinnerResultPhrase, input: undefined, execute: assertDeletedDinnerResult },
    world,
  );
});
