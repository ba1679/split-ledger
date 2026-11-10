import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from './harness.js';
import { seedSplittingExpenses } from './expense-fixture.js';
import {
  captureCurrentAmyArrangement,
  type PendingSettlementSnapshot,
} from './current-arrangement-fixture.js';
import { requestAmySettlement } from './settle-amy-command.js';
import {
  assertClosedSettlementProjection,
  assertPositiveSettlementClosed,
  positiveSettlementClosedPhrase,
} from './positive-settlement-closed-result.js';
import type { SourceSnapshot } from './types.js';

const pending: PendingSettlementSnapshot = {
  id: 'settlement',
  repaymentId: 'payment',
  arrangementKey: 'original-key',
  accountingRevision: '0',
  debtorMemberId: 'Amy',
  creditorMemberId: 'Alice',
  currencyCode: 'JPY',
  expectedAmount: { numerator: '100', denominator: '3', minorUnit: 0 },
};
const exact = (numerator: string, denominator = '3') => ({ numerator, denominator, minorUnit: 0 });

function source(paid: string): SourceSnapshot {
  const difference = 100n - BigInt(paid) * 3n;

  return {
    trips: [{ id: 'trip', accounting_revision: '1', simplify_debts: false }],
    members: ['Alice', 'Amy', 'Bob', 'Carol'].map((id) => ({ id })),
    expenses: [
      {
        id: 'expense',
        payer_member_id: 'Alice',
        amount_minor: '100',
        currency_code: 'JPY',
        minor_unit: 0,
      },
    ],
    shares: ['Alice', 'Amy', 'Bob'].map((member_id) => ({ expense_id: 'expense', member_id })),
    repayments: [
      {
        id: 'payment',
        settlement_id: 'settlement',
        payer_member_id: 'Amy',
        payee_member_id: 'Alice',
        amount_minor: paid,
        currency_code: 'JPY',
        minor_unit: 0,
      },
    ],
    settlements: [{ id: 'settlement', debtor_member_id: 'Amy', creditor_member_id: 'Alice' }],
    adjustments: [
      ['Amy', difference],
      ['Alice', -difference],
    ].map(([member_id, numerator]) => ({
      settlement_id: 'settlement',
      member_id,
      currency_code: 'JPY',
      numerator: String(numerator),
      denominator: '3',
      minor_unit: 0,
    })),
  };
}

function projection() {
  return {
    accountingRevision: '1',
    simplifyDebts: false,
    balances: [
      { memberId: 'Alice', currencyCode: 'JPY', netAmount: exact('100') },
      { memberId: 'Bob', currencyCode: 'JPY', netAmount: exact('-100') },
    ],
    arrangements: [
      {
        key: 'new-key',
        debtorMemberId: 'Bob',
        creditorMemberId: 'Alice',
        currencyCode: 'JPY',
        amount: exact('100'),
      },
    ],
  };
}

test('T100 reads legacy closed snapshots of 1/33/34/100, keeps Bob and allows omitted exact zero balances', () => {
  expect(positiveSettlementClosedPhrase).toBe('該安排已由正數實付關閉');
  for (const paid of ['1', '33', '34', '100']) {
    const after = source(paid);
    const view = projection();
    expect(() => assertClosedSettlementProjection(after, pending, view)).not.toThrow();
    expect(() =>
      assertClosedSettlementProjection(after, pending, { ...view, arrangements: [] }),
    ).toThrow();
    expect(() =>
      assertClosedSettlementProjection(after, pending, { ...view, balances: [] }),
    ).toThrow();
    expect(() =>
      assertClosedSettlementProjection(after, pending, {
        ...view,
        arrangements: [
          ...view.arrangements,
          {
            key: 'reverse',
            debtorMemberId: 'Alice',
            creditorMemberId: 'Amy',
            currencyCode: 'JPY',
            amount: exact('1'),
          },
        ],
      }),
    ).toThrow();
    expect(() =>
      assertClosedSettlementProjection({ ...after, adjustments: [] }, pending, view),
    ).toThrow();
  }
});

for (const paid of ['33', '34', '100'])
  test(`T100 real settlement closes arrangement with actual ${paid}`, async ({ world }) => {
    await seedSplittingExpenses(world, [
      { 項目: '點心', 幣別: 'JPY', 金額: '100', 付款人: 'Alice', 分攤者: 'Alice、Amy、Bob' },
    ]);
    await captureCurrentAmyArrangement(world);
    await requestAmySettlement(world, paid);
    await runIsolatedStep(
      {
        phrase: positiveSettlementClosedPhrase,
        input: undefined,
        execute: assertPositiveSettlementClosed,
      },
      world,
    );
  });
