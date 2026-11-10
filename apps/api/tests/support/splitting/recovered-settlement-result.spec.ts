import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from './harness.js';
import {
  seedLostSettlementResponse,
  type LostSettlementCommand,
} from './lost-settlement-fixture.js';
import { recoverSavedSettlement } from './recover-settlement-command.js';
import {
  assertRecoveredSettlement,
  assertRecoveredSettlementRecord,
  recoveredSettlementResultPhrase,
} from './recovered-settlement-result.js';
import type { SourceSnapshot } from './types.js';

test('T087 accepts the original immutable record and rejects changed IDs, money, dates or adjustments', () => {
  expect(recoveredSettlementResultPhrase).toBe('查證取得同一份結清與實付紀錄');
  const command: LostSettlementCommand = {
    id: 'settlement',
    repaymentId: 'repayment',
    arrangementKey: 'opaque-key',
    accountingRevision: '1',
    debtorMemberId: 'Amy',
    creditorMemberId: 'Alice',
    currencyCode: 'JPY',
    expectedAmount: { numerator: '100', denominator: '3', minorUnit: 0 },
    paidAmount: '33',
    paidOn: '2027-01-20',
  };
  const createdAt = '2027-01-20T12:00:00.000Z';
  const before: SourceSnapshot = {
    trips: [],
    members: [],
    expenses: [],
    shares: [],
    settlements: [
      {
        id: 'settlement',
        trip_id: 'trip',
        arrangement_key: 'opaque-key',
        source_revision: '1',
        simplify_debts: false,
        debtor_member_id: 'Amy',
        creditor_member_id: 'Alice',
        currency_code: 'JPY',
        obligation_numerator: '100',
        obligation_denominator: '3',
        obligation_minor_unit: 0,
        created_at: createdAt,
      },
    ],
    repayments: [
      {
        id: 'repayment',
        trip_id: 'trip',
        payer_member_id: 'Amy',
        payee_member_id: 'Alice',
        currency_code: 'JPY',
        amount_minor: '33',
        minor_unit: 0,
        paid_on: '2027-01-20',
        kind: 'settlement',
        settlement_id: 'settlement',
        created_at: createdAt,
      },
    ],
    adjustments: [
      {
        settlement_id: 'settlement',
        member_id: 'Amy',
        currency_code: 'JPY',
        numerator: '1',
        denominator: '3',
        minor_unit: 0,
      },
      {
        settlement_id: 'settlement',
        member_id: 'Alice',
        currency_code: 'JPY',
        numerator: '-1',
        denominator: '3',
        minor_unit: 0,
      },
    ],
  };
  const actual = {
    id: 'settlement',
    tripId: 'trip',
    arrangementKey: 'opaque-key',
    sourceRevision: '1',
    simplifyDebts: false,
    debtorMemberId: 'Amy',
    creditorMemberId: 'Alice',
    currencyCode: 'JPY',
    obligation: command.expectedAmount,
    repayment: {
      id: 'repayment',
      tripId: 'trip',
      payerMemberId: 'Amy',
      payeeMemberId: 'Alice',
      currencyCode: 'JPY',
      amount: '33',
      minorUnit: 0,
      paidOn: '2027-01-20',
      kind: 'settlement',
      settlementId: 'settlement',
      createdAt,
    },
    adjustments: [
      {
        memberId: 'Alice',
        currencyCode: 'JPY',
        amount: { numerator: '-1', denominator: '3', minorUnit: 0 },
      },
      {
        memberId: 'Amy',
        currencyCode: 'JPY',
        amount: { numerator: '1', denominator: '3', minorUnit: 0 },
      },
    ],
    createdAt,
  };
  assertRecoveredSettlementRecord(actual, before, command);
  for (const corrupt of [
    { ...actual, id: 'second-settlement' },
    { ...actual, repayment: { ...actual.repayment, id: 'second-repayment' } },
    { ...actual, repayment: { ...actual.repayment, amount: '34' } },
    { ...actual, repayment: { ...actual.repayment, paidOn: '2027-01-21' } },
    { ...actual, obligation: { numerator: '33', denominator: '1', minorUnit: 0 } },
    { ...actual, adjustments: actual.adjustments.slice(0, 1) },
  ])
    expect(() => assertRecoveredSettlementRecord(corrupt, before, command)).toThrow();
});

test('T087 isolated recovery retains exactly the committed settlement and payment', async ({
  world,
}) => {
  await seedLostSettlementResponse(world);
  await recoverSavedSettlement(world);
  await runIsolatedStep(
    {
      phrase: recoveredSettlementResultPhrase,
      input: undefined,
      execute: assertRecoveredSettlement,
    },
    world,
  );
});
