import { test, expect } from '../fixtures.js';
import { seedAmySettledBobOutstanding } from './sequential-settlement-fixture.js';
import { settleRemainingBobArrangement } from './settle-bob-command.js';
import { runIsolatedStep } from './harness.js';
import {
  assertExactlyZeroSnackView,
  assertSequentialSnackSettled,
  assertSequentialSnackSources,
  assertSequentialSettlementRecord,
  sequentialSettlementResultPhrase,
} from './sequential-settlement-result.js';
import type { SourceSnapshot } from './types.js';

test('T102 rejects malformed original creation records even when the saved database is correct', () => {
  const stamp = '2027-01-20T12:00:00.387Z';
  const sources: SourceSnapshot = {
    trips: [],
    members: [],
    expenses: [],
    shares: [],
    settlements: [
      {
        id: 's',
        trip_id: 'trip',
        arrangement_key: 'key',
        source_revision: '1',
        simplify_debts: false,
        debtor_member_id: 'bob',
        creditor_member_id: 'alice',
        currency_code: 'JPY',
        obligation_numerator: '100',
        obligation_denominator: '3',
        obligation_minor_unit: 0,
        created_at: new Date(stamp),
      },
    ],
    repayments: [
      {
        id: 'r',
        trip_id: 'trip',
        payer_member_id: 'bob',
        payee_member_id: 'alice',
        amount_minor: '34',
        currency_code: 'JPY',
        minor_unit: 0,
        paid_on: '2027-01-20',
        kind: 'settlement',
        settlement_id: 's',
        created_at: new Date(stamp),
      },
    ],
    adjustments: [
      {
        settlement_id: 's',
        member_id: 'bob',
        currency_code: 'JPY',
        numerator: '-2',
        denominator: '3',
        minor_unit: 0,
      },
      {
        settlement_id: 's',
        member_id: 'alice',
        currency_code: 'JPY',
        numerator: '2',
        denominator: '3',
        minor_unit: 0,
      },
    ],
  };
  const record = {
    id: 's',
    tripId: 'trip',
    arrangementKey: 'key',
    sourceRevision: '1',
    simplifyDebts: false,
    debtorMemberId: 'bob',
    creditorMemberId: 'alice',
    currencyCode: 'JPY',
    obligation: { numerator: '100', denominator: '3', minorUnit: 0 },
    repayment: {
      id: 'r',
      tripId: 'trip',
      payerMemberId: 'bob',
      payeeMemberId: 'alice',
      amount: '34',
      currencyCode: 'JPY',
      minorUnit: 0,
      paidOn: '2027-01-20',
      kind: 'settlement',
      settlementId: 's',
      createdAt: stamp,
    },
    adjustments: [
      {
        memberId: 'bob',
        currencyCode: 'JPY',
        amount: { numerator: '-2', denominator: '3', minorUnit: 0 },
      },
      {
        memberId: 'alice',
        currencyCode: 'JPY',
        amount: { numerator: '2', denominator: '3', minorUnit: 0 },
      },
    ],
    createdAt: stamp,
  };
  assertSequentialSettlementRecord(record, sources, 's', 'r');
  for (const bad of [
    { ...record, id: 'other' },
    { ...record, createdAt: '2027-01-20T12:00:00.000Z' },
    { ...record, repayment: { ...record.repayment, amount: '33' } },
    { ...record, obligation: { numerator: '33', denominator: '1', minorUnit: 0 } },
    { ...record, adjustments: record.adjustments.slice(0, 1) },
    { ...record, roundingPolicy: 'nearest' },
  ])
    expect(() => assertSequentialSettlementRecord(bad, sources, 's', 'r')).toThrow();
});

test('T102 requires actual rational zero and permits omitted zero rows', () => {
  expect(sequentialSettlementResultPhrase).toBe('點心所有安排結清且全體沒有尾差');
  expect(() =>
    assertExactlyZeroSnackView({ arrangements: [], balances: [] }, ['alice', 'amy', 'bob']),
  ).not.toThrow();
  const zero = {
    memberId: 'bob',
    currencyCode: 'JPY',
    netAmount: { numerator: '0', denominator: '1', minorUnit: 0 },
  };
  expect(() =>
    assertExactlyZeroSnackView({ arrangements: [], balances: [zero] }, ['bob']),
  ).not.toThrow();
  for (const numerator of ['1', '-1'])
    expect(() =>
      assertExactlyZeroSnackView(
        {
          arrangements: [],
          balances: [{ ...zero, netAmount: { numerator, denominator: '3', minorUnit: 0 } }],
        },
        ['bob'],
      ),
    ).toThrow();
  expect(() => assertExactlyZeroSnackView({ arrangements: [{}], balances: [] }, ['bob'])).toThrow();
  expect(() =>
    assertExactlyZeroSnackView({ arrangements: [], balances: [zero, zero] }, ['bob']),
  ).toThrow();
});

test('T102 isolated Then verifies Bob34 and preserved Amy33 exact history', async ({ world }) => {
  await seedAmySettledBobOutstanding(world);
  await settleRemainingBobArrangement(world);
  await runIsolatedStep(
    {
      phrase: sequentialSettlementResultPhrase,
      input: undefined,
      execute: assertSequentialSnackSettled,
    },
    world,
  );
});

test('T102 source oracle rejects changed Amy history, Bob adjustment and rounded shares', () => {
  const ids = { alice: 'alice', amy: 'amy', bob: 'bob', settlement: 'bob-s', repayment: 'bob-r' };
  const expense = {
    id: 'snack',
    payer_member_id: 'alice',
    amount_minor: '100',
    currency_code: 'JPY',
    minor_unit: 0,
  };
  const before = {
    trips: [],
    members: [],
    expenses: [expense],
    shares: ['alice', 'amy', 'bob'].map((member_id) => ({ expense_id: 'snack', member_id })),
    settlements: [{ id: 'amy-s' }],
    repayments: [
      {
        id: 'amy-r',
        payer_member_id: 'amy',
        payee_member_id: 'alice',
        amount_minor: '33',
        minor_unit: 0,
        currency_code: 'JPY',
        kind: 'settlement',
      },
    ],
    adjustments: [
      {
        settlement_id: 'amy-s',
        member_id: 'amy',
        currency_code: 'JPY',
        numerator: '1',
        denominator: '3',
        minor_unit: 0,
      },
      {
        settlement_id: 'amy-s',
        member_id: 'alice',
        currency_code: 'JPY',
        numerator: '-1',
        denominator: '3',
        minor_unit: 0,
      },
    ],
  };
  const after = {
    ...before,
    settlements: [
      ...before.settlements,
      {
        id: 'bob-s',
        debtor_member_id: 'bob',
        creditor_member_id: 'alice',
        currency_code: 'JPY',
        obligation_numerator: '100',
        obligation_denominator: '3',
        obligation_minor_unit: 0,
      },
    ],
    repayments: [
      ...before.repayments,
      {
        id: 'bob-r',
        payer_member_id: 'bob',
        payee_member_id: 'alice',
        amount_minor: '34',
        minor_unit: 0,
        currency_code: 'JPY',
        kind: 'settlement',
        settlement_id: 'bob-s',
      },
    ],
    adjustments: [
      ...before.adjustments,
      {
        settlement_id: 'bob-s',
        member_id: 'bob',
        currency_code: 'JPY',
        numerator: '-2',
        denominator: '3',
        minor_unit: 0,
      },
      {
        settlement_id: 'bob-s',
        member_id: 'alice',
        currency_code: 'JPY',
        numerator: '2',
        denominator: '3',
        minor_unit: 0,
      },
    ],
  };
  expect(() => assertSequentialSnackSources(before, after, ids)).not.toThrow();
  expect(() =>
    assertSequentialSnackSources(
      before,
      {
        ...after,
        repayments: after.repayments.map((row) =>
          row.id === 'amy-r' ? { ...row, amount_minor: '34' } : row,
        ),
      },
      ids,
    ),
  ).toThrow();
  expect(() =>
    assertSequentialSnackSources(
      before,
      {
        ...after,
        adjustments: after.adjustments.map((row) =>
          row.member_id === 'bob' ? { ...row, numerator: '-1' } : row,
        ),
      },
      ids,
    ),
  ).toThrow();
  expect(() =>
    assertSequentialSnackSources(
      before,
      { ...after, expenses: [{ ...expense, amount_minor: '99' }] },
      ids,
    ),
  ).toThrow();
});
