import { test, expect } from '../fixtures.js';
import {
  assertSingleConcurrentSettlement,
  assertConcurrentSettlementResult,
  concurrentSettlementResultPhrase,
} from './concurrent-settlement-result.js';
import { seedSplittingExpenses } from './expense-fixture.js';
import { captureCurrentAmyArrangement } from './current-arrangement-fixture.js';
import { requestConcurrentSettlements } from './concurrent-settlement-command.js';
import { runIsolatedStep } from './harness.js';
import type { SourceSnapshot } from './types.js';

function example(winnerIndex: number) {
  const before: SourceSnapshot = {
    trips: [{ id: 'trip', owner_id: 'owner', accounting_revision: '4', simplify_debts: false }],
    members: [{ id: 'alice' }, { id: 'amy' }],
    expenses: [
      {
        id: 'expense',
        payer_member_id: 'alice',
        amount_minor: '100',
        currency_code: 'JPY',
        minor_unit: 0,
      },
    ],
    shares: [
      {
        expense_id: 'expense',
        member_id: 'amy',
        numerator: '100',
        denominator: '1',
        minor_unit: 0,
      },
    ],
    settlements: [],
    repayments: [],
    adjustments: [],
  };
  const commands = ['33', '34'].map((paidAmount, i) => ({
    id: `settlement-${i}`,
    repaymentId: `payment-${i}`,
    arrangementKey: 'current-key',
    accountingRevision: '4',
    debtorMemberId: 'amy',
    creditorMemberId: 'alice',
    currencyCode: 'JPY',
    expectedAmount: { numerator: '100', denominator: '1', minorUnit: 0 },
    paidAmount,
    paidOn: '2027-01-20',
  }));
  const winner = commands[winnerIndex]!;
  const after: SourceSnapshot = {
    ...structuredClone(before),
    trips: [{ ...before.trips[0], accounting_revision: '5' }],
    settlements: [
      {
        id: winner.id,
        owner_id: 'owner',
        trip_id: 'trip',
        debtor_member_id: 'amy',
        creditor_member_id: 'alice',
        currency_code: 'JPY',
        arrangement_key: 'current-key',
        source_revision: '4',
        simplify_debts: false,
        obligation_numerator: '100',
        obligation_denominator: '1',
        obligation_minor_unit: 0,
      },
    ],
    repayments: [
      {
        id: winner.repaymentId,
        owner_id: 'owner',
        trip_id: 'trip',
        payer_member_id: 'amy',
        payee_member_id: 'alice',
        currency_code: 'JPY',
        amount_minor: winner.paidAmount,
        minor_unit: 0,
        kind: 'settlement',
        settlement_id: winner.id,
        paid_on: '2027-01-20',
        created_at: '2027-01-20T00:00:00.000Z',
      },
    ],
    adjustments: ['amy', 'alice'].map((member_id) => ({
      settlement_id: winner.id,
      owner_id: 'owner',
      trip_id: 'trip',
      member_id,
      currency_code: 'JPY',
      numerator: ((100n - BigInt(winner.paidAmount)) * (member_id === 'amy' ? 1n : -1n)).toString(),
      denominator: '1',
      minor_unit: 0,
    })),
  };
  const statuses = winnerIndex === 0 ? [201, 409] : [409, 201];
  const replies = statuses.map((status) =>
    status === 409 ? { code: 'ACCOUNTING_REVISION_CONFLICT' } : {},
  );

  return { before, after, commands, statuses, replies, arrivals: commands.map((row) => row.id) };
}

for (const winnerIndex of [0, 1]) {
  test(`T084 accepts either actual winner ${winnerIndex} and rejects partial or duplicate saves`, () => {
    const data = example(winnerIndex);
    const check = (after = data.after, statuses = data.statuses, arrivals = data.arrivals) =>
      assertSingleConcurrentSettlement(
        data.before,
        after,
        data.commands,
        statuses,
        data.replies,
        arrivals,
      );
    expect(check()).toBe(winnerIndex);
    expect(() => check(data.after, [201, 201])).toThrow();
    expect(() => check(data.after, data.statuses, [data.arrivals[0]!])).toThrow();
    expect(() =>
      check({ ...data.after, adjustments: data.after.adjustments.slice(0, 1) }),
    ).toThrow();
    expect(() =>
      check({
        ...data.after,
        repayments: [...data.after.repayments, { id: data.commands[1 - winnerIndex]!.repaymentId }],
      }),
    ).toThrow();
    expect(() =>
      check({ ...data.after, trips: [{ ...data.after.trips[0], accounting_revision: '6' }] }),
    ).toThrow();
    expect(() =>
      check({
        ...data.after,
        adjustments: data.after.adjustments.map((row) => ({ ...row, numerator: '0' })),
      }),
    ).toThrow();
  });
}

test('T084 isolated Then checks real concurrent durable outcome with read-only verification', async ({
  world,
}) => {
  await seedSplittingExpenses(world, [
    { 項目: '午餐', 幣別: 'JPY', 金額: '100', 付款人: 'Alice', 分攤者: 'Amy' },
  ]);
  await captureCurrentAmyArrangement(world);
  await requestConcurrentSettlements(world);
  await runIsolatedStep(
    {
      phrase: concurrentSettlementResultPhrase,
      input: undefined,
      execute: assertConcurrentSettlementResult,
    },
    world,
  );
});
