import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from './harness.js';
import {
  seedSplittingExpenses,
  snapshotSplittingSources,
  independentSplittingOracle,
} from './expense-fixture.js';
import { callApi } from '../seed.js';
import { splittingTripId } from './members-fixture.js';
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

// Only payments that close the obligation exercise the no-remainder assertion.
// The current settlement contract preserves material underpayment as independent cash.
for (const amount of ['33', '34', '100', '700'])
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

test('T101 cash 1 preserves exact 97/3 debt without a settlement or adjustment', async ({
  world,
}) => {
  await seedSplittingExpenses(world, [
    { 項目: '點心', 幣別: 'JPY', 金額: '100', 付款人: 'Alice', 分攤者: 'Alice、Amy、Bob' },
  ]);
  await captureCurrentAmyArrangement(world);
  await requestAmySettlement(world, '1');
  expect(world.response!.status()).toBe(201);
  const body = await world.response!.json();
  const before = world.get<SourceSnapshot>('splitting:before');
  const after = await snapshotSplittingSources(world);
  const pending = world.get<PendingSettlementSnapshot>('splitting:settlementSnapshot');
  const expected = { numerator: '97', denominator: '3', minorUnit: 0 };

  expect(body.kind).toBe('partial');
  expect(independentSplittingOracle.equal(body.remainingAmount, expected)).toBe(true);
  for (const key of ['expenses', 'shares', 'members', 'settlements', 'adjustments'] as const)
    expect(after[key]).toEqual(before[key]);
  expect(after.repayments).toHaveLength(before.repayments.length + 1);
  expect(after.repayments.find((row) => row.id === pending.repaymentId)).toMatchObject({
    kind: 'independent',
    settlement_id: null,
    payer_member_id: pending.debtorMemberId,
    payee_member_id: pending.creditorMemberId,
    amount_minor: '1',
  });
  expect(BigInt(String(after.trips[0]!.accounting_revision))).toBe(
    BigInt(String(before.trips[0]!.accounting_revision)) + 1n,
  );
  const tripId = splittingTripId(world);
  const state = await callApi(world, 'GET', `/api/trips/${tripId}/settlement`);
  expect(state.status()).toBe(200);
  const view = await state.json();
  const remaining = view.arrangements.filter(
    (row: { debtorMemberId: string; creditorMemberId: string; currencyCode: string }) =>
      row.debtorMemberId === pending.debtorMemberId &&
      row.creditorMemberId === pending.creditorMemberId &&
      row.currencyCode === 'JPY',
  );
  expect(remaining).toHaveLength(1);
  expect(independentSplittingOracle.equal(remaining[0].amount, expected)).toBe(true);
  const payment = await callApi(
    world,
    'GET',
    `/api/trips/${tripId}/repayments/${pending.repaymentId}`,
  );
  expect(payment.status()).toBe(200);
  expect(await payment.json()).toEqual(body.repayment);
  expect(await snapshotSplittingSources(world)).toEqual(after);
});
