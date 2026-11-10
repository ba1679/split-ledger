import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from './harness.js';
import { seedOriginalSettledExpense } from './settled-expense-fixture.js';
import { changeOriginalExpenseToEightHundred } from './change-expense-to-eight-hundred-command.js';
import { deleteOriginalPaidExpense } from './delete-paid-expense-command.js';
import {
  assertPreservedSettlementHistory,
  assertHistoricalCurrentBalances,
  historicalRepaymentProjection,
  preservedSettlementHistoryPhrase,
} from './preserved-settlement-history.js';

for (const [name, command] of [
  ['PATCH', changeOriginalExpenseToEightHundred],
  ['DELETE', deleteOriginalPaidExpense],
] as const) {
  test(`T062 isolated history assertion after ${name}`, async ({ world }) => {
    await seedOriginalSettledExpense(world);
    await command(world);
    await runIsolatedStep(
      {
        phrase: preservedSettlementHistoryPhrase,
        input: undefined,
        execute: assertPreservedSettlementHistory,
      },
      world,
    );
  });
}

test('T062 parameter-free phrase and historical payment projection preserve every public field', () => {
  expect(preservedSettlementHistoryPhrase).toBe('原支出修正後的歷史結清快照保持不變');
  expect(preservedSettlementHistoryPhrase).not.toMatch(/[{}]/);
  expect(
    historicalRepaymentProjection({
      id: 'payment',
      trip_id: 'trip',
      payer_member_id: 'Amy',
      payee_member_id: 'Alice',
      amount_minor: '33',
      minor_unit: 0,
      currency_code: 'JPY',
      paid_on: new Date(2027, 0, 20),
      kind: 'settlement',
      settlement_id: 'settlement',
      created_at: new Date('2027-01-20T12:00:00Z'),
    }),
  ).toEqual({
    id: 'payment',
    tripId: 'trip',
    payerMemberId: 'Amy',
    payeeMemberId: 'Alice',
    amount: '33',
    minorUnit: 0,
    currencyCode: 'JPY',
    paidOn: '2027-01-20',
    kind: 'settlement',
    settlementId: 'settlement',
    createdAt: '2027-01-20T12:00:00.000Z',
  });
});

for (const includeZero of [false, true]) {
  test(`T062 current balances accept optional zero rows: ${includeZero}`, () => {
    const amount = (numerator: string) => ({ numerator, denominator: '1', minorUnit: 0 });
    const expected = [
      { memberId: 'Alice', amount: amount('700') },
      { memberId: 'Amy', amount: amount('-700') },
      { memberId: 'Bob', amount: amount('0') },
      { memberId: 'Carol', amount: amount('0') },
    ];
    const actual = expected
      .filter((row) => includeZero || row.amount.numerator !== '0')
      .map((row) => ({ memberId: row.memberId, currencyCode: 'JPY', netAmount: row.amount }));
    expect(() => assertHistoricalCurrentBalances(actual, expected)).not.toThrow();
    expect(() =>
      assertHistoricalCurrentBalances(
        actual.filter((row) => row.memberId !== 'Amy'),
        expected,
      ),
    ).toThrow();
    expect(() => assertHistoricalCurrentBalances([...actual, actual[0]!], expected)).toThrow();
    expect(() =>
      assertHistoricalCurrentBalances(
        [...actual, { memberId: 'foreign', currencyCode: 'JPY', netAmount: amount('0') }],
        expected,
      ),
    ).toThrow();
    expect(() =>
      assertHistoricalCurrentBalances(
        actual.map((row) => ({ ...row, currencyCode: 'TWD' })),
        expected,
      ),
    ).toThrow();
    expect(() =>
      assertHistoricalCurrentBalances(
        actual.map((row) => ({ ...row, netAmount: amount('0') })),
        expected,
      ),
    ).toThrow();
  });
}

test('T062 raw pg dates retain calendar fields and timestamp milliseconds', () => {
  for (const month of [0, 6]) {
    const projection = historicalRepaymentProjection({
      id: 'payment',
      trip_id: 'trip',
      payer_member_id: 'Amy',
      payee_member_id: 'Alice',
      amount_minor: '33',
      minor_unit: 0,
      currency_code: 'JPY',
      paid_on: new Date(2027, month, 20),
      kind: 'settlement',
      settlement_id: 'settlement',
      created_at: new Date('2027-01-20T12:00:00.685Z'),
    });
    expect(projection.paidOn).toBe(month === 0 ? '2027-01-20' : '2027-07-20');
    expect(projection.createdAt).toBe('2027-01-20T12:00:00.685Z');
  }
});
