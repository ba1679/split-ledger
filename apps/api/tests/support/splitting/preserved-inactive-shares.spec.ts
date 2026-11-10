import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from './harness.js';
import { seedSplittingExpenses } from './expense-fixture.js';
import { seedExpenseValidationMembers } from './expense-validation-fixture.js';
import { renameExpenseWithInactiveShares } from './inactive-expense-command.js';
import {
  assertInactiveShareRows,
  assertPreservedInactiveShares,
  preservedInactiveSharesPhrase,
} from './preserved-inactive-shares.js';
import type { SourceSnapshot } from './types.js';

test('T065 parameter-free historical share assertion rejects changed payer, shares and new member references', () => {
  expect(preservedInactiveSharesPhrase).toBe('既有停用成員的分攤集合保持原值');
  expect(preservedInactiveSharesPhrase).not.toMatch(/[{}]/);
  const before: SourceSnapshot = {
    trips: [],
    members: [{ id: 'Carol', is_active: false }],
    expenses: [{ id: 'e', payer_member_id: 'Alice', item: '晚餐', updated_at: 'old' }],
    shares: [{ expense_id: 'e', member_id: 'Carol' }],
    repayments: [],
    settlements: [],
    adjustments: [],
  };
  const after: SourceSnapshot = {
    ...before,
    expenses: [{ ...before.expenses[0], item: '車票修正', updated_at: 'new' }],
  };
  expect(() => assertInactiveShareRows(before, after, 'e', 'Carol')).not.toThrow();
  expect(() => assertInactiveShareRows(before, { ...after, shares: [] }, 'e', 'Carol')).toThrow();
  expect(() =>
    assertInactiveShareRows(
      before,
      { ...after, expenses: [{ ...after.expenses[0], payer_member_id: 'Amy' }] },
      'e',
      'Carol',
    ),
  ).toThrow();
  expect(() =>
    assertInactiveShareRows(
      before,
      { ...after, members: [...after.members, { id: 'new' }] },
      'e',
      'Carol',
    ),
  ).toThrow();
});

test('T065 isolated preserved inactive share Then after item-only correction', async ({
  world,
}) => {
  await seedSplittingExpenses(world, [
    { 項目: '晚餐', 幣別: 'JPY', 金額: '100', 付款人: 'Alice', 分攤者: 'Carol' },
  ]);
  await seedExpenseValidationMembers(world);
  await renameExpenseWithInactiveShares(world);
  await runIsolatedStep(
    {
      phrase: preservedInactiveSharesPhrase,
      input: undefined,
      execute: assertPreservedInactiveShares,
    },
    world,
  );
});
