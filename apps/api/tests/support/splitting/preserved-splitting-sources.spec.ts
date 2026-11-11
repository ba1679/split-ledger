import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from './harness.js';
import { seedPaymentHistorySources } from './history-reconstruction-fixture.js';
import { seedSimplificationMode } from './simplification-mode-fixture.js';
import { changeSimplificationMode } from './change-simplification-command.js';
import {
  dateOnly,
  assertPreservedSplittingSources,
  assertSplittingSourceRows,
  preservedSplittingSourcesPhrase,
} from './preserved-splitting-sources.js';
import type { SourceSnapshot } from './types.js';

test('T082 parameter-free assertion checks every source business column and permits metadata/timestamps', () => {
  expect(preservedSplittingSourcesPhrase).toBe('分帳來源紀錄維持操作前內容');
  expect(preservedSplittingSourcesPhrase).not.toMatch(/[{}]/);
  const before: SourceSnapshot = {
    trips: [{ simplify_debts: false, accounting_revision: '1' }],
    members: [{ name: 'Amy', is_active: true }],
    expenses: [
      {
        id: 'e',
        payer_member_id: 'Alice',
        amount_minor: '100',
        currency_code: 'JPY',
        minor_unit: 0,
        spent_on: '2027-01-20',
        category_id: null,
        item: '點心',
        created_at: 'old',
        updated_at: 'old',
      },
    ],
    shares: [{ expense_id: 'e', member_id: 'Amy' }],
    repayments: [{ id: 'r', amount_minor: '33', kind: 'settlement', settlement_id: 's' }],
    settlements: [
      { id: 's', source_revision: '0', obligation_numerator: '100', obligation_denominator: '3' },
    ],
    adjustments: [{ settlement_id: 's', member_id: 'Amy', numerator: '1', denominator: '3' }],
  };
  const metadata = structuredClone(before);
  metadata.trips[0]!.simplify_debts = true;
  metadata.trips[0]!.accounting_revision = '2';
  metadata.members[0]!.name = 'Amy renamed';
  metadata.members[0]!.is_active = false;
  metadata.expenses[0]!.updated_at = 'new';
  expect(() => assertSplittingSourceRows(before, metadata)).not.toThrow();
  for (const source of [
    'expenses',
    'shares',
    'repayments',
    'settlements',
    'adjustments',
  ] as const) {
    expect(() => assertSplittingSourceRows(before, { ...before, [source]: [] })).toThrow();
    for (const field of Object.keys(before[source][0]!).filter(
      (field) => !['created_at', 'updated_at'].includes(field),
    )) {
      const changed = structuredClone(before);
      changed[source][0]![field] = 'changed';
      expect(() => assertSplittingSourceRows(before, changed)).toThrow();
    }
  }
});

for (const mode of ['開啟', '關閉']) {
  test(`T082 isolated source-preservation Then after switching ${mode}`, async ({ world }) => {
    await seedPaymentHistorySources(world);
    await seedSimplificationMode(world, mode === '開啟' ? '關閉' : '開啟');
    await changeSimplificationMode(world, mode);
    await runIsolatedStep(
      {
        phrase: preservedSplittingSourcesPhrase,
        input: undefined,
        execute: assertPreservedSplittingSources,
      },
      world,
    );
  });
}

test('T082 SQL DATE projection retains local calendar fields without UTC conversion', () => {
  expect(dateOnly(new Date(2027, 0, 20))).toBe('2027-01-20');
  expect(dateOnly(new Date(2027, 6, 20))).toBe('2027-07-20');
  expect(dateOnly('2027-01-20')).toBe('2027-01-20');
});
