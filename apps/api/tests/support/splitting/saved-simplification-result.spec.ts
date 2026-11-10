import { test, expect } from '../fixtures.js';
import { changeSimplificationMode } from './change-simplification-command.js';
import { seedSplittingExpenses } from './expense-fixture.js';
import { runIsolatedStep } from './harness.js';
import { seedSimplificationMode } from './simplification-mode-fixture.js';
import {
  assertSavedModeProjections,
  assertSavedSimplification,
  savedSimplificationPhrase,
} from './saved-simplification-result.js';
import type { SourceSnapshot } from './types.js';

test('T089 registers one mode and rejects stale, mismatched, or client-only settings', () => {
  expect(savedSimplificationPhrase).toBe('簡化付款設定已保存為 {string}');
  expect(savedSimplificationPhrase.match(/\{string\}/g)).toHaveLength(1);
  const before: SourceSnapshot = {
    trips: [{ id: 'trip', simplify_debts: false, accounting_revision: '4' }],
    members: [],
    expenses: [],
    shares: [],
    repayments: [],
    settlements: [],
    adjustments: [],
  };
  const after = {
    ...before,
    trips: [{ id: 'trip', simplify_debts: true, accounting_revision: '5' }],
  };
  const projections = Array.from({ length: 5 }, () => ({
    simplifyDebts: true,
    accountingRevision: '5',
  }));
  expect(() => assertSavedModeProjections('開啟', before, after, projections)).not.toThrow();
  expect(() => assertSavedModeProjections('開啟', before, before, projections)).toThrow();
  for (let index = 0; index < projections.length; index++) {
    for (const invalid of [
      { simplifyDebts: false, accountingRevision: '5' },
      { simplifyDebts: true, accountingRevision: '4' },
    ]) {
      const mutated = [...projections];
      mutated[index] = invalid;
      expect(() => assertSavedModeProjections('開啟', before, after, mutated)).toThrow();
    }
  }
  expect(() => assertSavedModeProjections('未知', before, after, projections)).toThrow();
  const disabled = {
    ...after,
    trips: [{ id: 'trip', simplify_debts: false, accounting_revision: '6' }],
  };
  expect(() =>
    assertSavedModeProjections(
      '關閉',
      after,
      disabled,
      projections.map(() => ({ simplifyDebts: false, accountingRevision: '6' })),
    ),
  ).not.toThrow();
});

for (const mode of ['開啟', '關閉'])
  test(`T089 isolated ${mode} confirms DB and a new same-owner session`, async ({ world }) => {
    await seedSplittingExpenses(world, [
      { 項目: '點心', 幣別: 'JPY', 金額: '100', 付款人: 'Alice', 分攤者: 'Alice、Amy、Bob' },
    ]);
    await seedSimplificationMode(world, mode === '開啟' ? '關閉' : '開啟');
    await changeSimplificationMode(world, mode);
    await runIsolatedStep(
      { phrase: savedSimplificationPhrase, input: mode, execute: assertSavedSimplification },
      world,
    );
  });
