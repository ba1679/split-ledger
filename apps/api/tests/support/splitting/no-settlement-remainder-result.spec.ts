import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from './harness.js';
import { seedSplittingExpenses } from './expense-fixture.js';
import {
  captureCurrentAmyArrangement,
  type PendingSettlementSnapshot,
} from './current-arrangement-fixture.js';
import { requestAmySettlement } from './settle-amy-command.js';
import {
  assertExactSettlementCancellation,
  assertNoSettlementRemainder,
  noSettlementRemainderPhrase,
} from './no-settlement-remainder-result.js';
import {
  assertExactArrangementSet,
  directExpenseArrangements,
} from './expense-arrangements-result.js';
import type { SourceSnapshot } from './types.js';

function cancellationFixture(paid: string) {
  const pending: PendingSettlementSnapshot = {
    id: 'settlement',
    repaymentId: 'payment',
    arrangementKey: 'key',
    accountingRevision: '0',
    debtorMemberId: 'Amy',
    creditorMemberId: 'Alice',
    currencyCode: 'JPY',
    expectedAmount: { numerator: '100', denominator: '3', minorUnit: 0 },
  };
  const before: SourceSnapshot = {
    trips: [],
    members: [],
    expenses: [
      {
        id: 'snack',
        payer_member_id: 'Alice',
        amount_minor: '100',
        minor_unit: 0,
        currency_code: 'JPY',
      },
    ],
    shares: ['Alice', 'Amy', 'Bob'].map((member_id) => ({ expense_id: 'snack', member_id })),
    repayments: [],
    settlements: [],
    adjustments: [],
  };
  const diff = (100n - BigInt(paid) * 3n).toString();
  const after: SourceSnapshot = {
    ...before,
    settlements: [
      {
        id: pending.id,
        debtor_member_id: 'Amy',
        creditor_member_id: 'Alice',
        currency_code: 'JPY',
        obligation_numerator: '100',
        obligation_denominator: '3',
        obligation_minor_unit: 0,
      },
    ],
    repayments: [
      {
        id: pending.repaymentId,
        settlement_id: pending.id,
        kind: 'settlement',
        payer_member_id: 'Amy',
        payee_member_id: 'Alice',
        currency_code: 'JPY',
        amount_minor: paid,
        minor_unit: 0,
      },
    ],
    adjustments: [
      {
        settlement_id: pending.id,
        member_id: 'Amy',
        currency_code: 'JPY',
        numerator: diff,
        denominator: '3',
        minor_unit: 0,
      },
      {
        settlement_id: pending.id,
        member_id: 'Alice',
        currency_code: 'JPY',
        numerator: (-BigInt(diff)).toString(),
        denominator: '3',
        minor_unit: 0,
      },
    ],
  };

  return { before, after, pending };
}

test('T101 exact cancellation for arbitrary positive cash preserves Bob and rejects rounded residuals', () => {
  expect(noSettlementRemainderPhrase).toBe('該安排沒有反向付款或殘餘尾差');
  for (const paid of ['1', '33', '34', '100']) {
    const { before, after, pending } = cancellationFixture(paid);
    expect(() => assertExactSettlementCancellation(before, after, pending)).not.toThrow();
    const expected = [
      {
        debtorMemberId: 'Bob',
        creditorMemberId: 'Alice',
        currencyCode: 'JPY',
        amount: { numerator: '100', denominator: '3', minorUnit: 0 },
      },
    ];
    assertExactArrangementSet(directExpenseArrangements(after), expected);
    expect(() => assertExactArrangementSet([], expected)).toThrow();
    const rounded = {
      ...after,
      adjustments: after.adjustments.map((row) => ({
        ...row,
        numerator: ((BigInt(String(row.numerator)) * 100n) / 3n).toString(),
        denominator: '100',
      })),
    };
    expect(() => assertExactSettlementCancellation(before, rounded, pending)).toThrow();
    expect(() =>
      assertExactSettlementCancellation(
        before,
        { ...after, shares: after.shares.slice(1) },
        pending,
      ),
    ).toThrow();
  }
});

for (const amount of ['1', '33', '34', '100', '700'])
  test(`T101 real no reverse or residual after cash ${amount}`, async ({ world }) => {
    await seedSplittingExpenses(world, [
      amount === '700'
        ? { 項目: '午餐', 幣別: 'JPY', 金額: '600', 付款人: 'Alice', 分攤者: 'Amy' }
        : { 項目: '點心', 幣別: 'JPY', 金額: '100', 付款人: 'Alice', 分攤者: 'Alice、Amy、Bob' },
    ]);
    await captureCurrentAmyArrangement(world);
    await requestAmySettlement(world, amount);
    await runIsolatedStep(
      {
        phrase: noSettlementRemainderPhrase,
        input: undefined,
        execute: assertNoSettlementRemainder,
      },
      world,
    );
  });
