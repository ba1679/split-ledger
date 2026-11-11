import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from './harness.js';
import { seedSplittingExpenses } from './expense-fixture.js';
import { captureCurrentAmyArrangement } from './current-arrangement-fixture.js';
import { requestAmySettlement } from './settle-amy-command.js';
import {
  assertNoRoundingPolicy,
  assertOnlyContractFields,
  assertSettlementHasNoPolicy,
  noRoundingPolicyPhrase,
} from './no-rounding-policy-result.js';

test('T095 complete API contract excludes nested strategy fields and persisted policy metadata', () => {
  expect(noRoundingPolicyPhrase).toBe('結清紀錄沒有取整方式欄位');
  const exact = { numerator: '100', denominator: '3', minorUnit: 0 };
  const record = {
    id: 'settlement',
    tripId: 'trip',
    arrangementKey: 'key',
    sourceRevision: '1',
    simplifyDebts: false,
    debtorMemberId: 'Amy',
    creditorMemberId: 'Alice',
    currencyCode: 'JPY',
    obligation: exact,
    createdAt: '2027-01-20T00:00:00Z',
    repayment: {
      id: 'repayment',
      tripId: 'trip',
      payerMemberId: 'Amy',
      payeeMemberId: 'Alice',
      amount: '33',
      currencyCode: 'JPY',
      minorUnit: 0,
      paidOn: '2027-01-20',
      kind: 'settlement',
      settlementId: 'settlement',
      createdAt: '2027-01-20T00:00:00Z',
    },
    adjustments: ['Amy', 'Alice'].map((memberId) => ({
      memberId,
      currencyCode: 'JPY',
      amount: exact,
    })),
  };
  expect(() => assertSettlementHasNoPolicy(record)).not.toThrow();
  for (const field of ['roundingMethod', 'rounding_policy', 'roundingStrategy', 'metadata']) {
    expect(() => assertSettlementHasNoPolicy({ ...record, [field]: 'nearest' })).toThrow();
    expect(() =>
      assertSettlementHasNoPolicy({
        ...record,
        repayment: { ...record.repayment, [field]: 'nearest' },
      }),
    ).toThrow();
    expect(() =>
      assertSettlementHasNoPolicy({ ...record, obligation: { ...exact, [field]: 'nearest' } }),
    ).toThrow();
    expect(() =>
      assertSettlementHasNoPolicy({
        ...record,
        adjustments: [{ ...record.adjustments[0], [field]: 'nearest' }, record.adjustments[1]],
      }),
    ).toThrow();
    expect(() => assertOnlyContractFields({ id: 'row', [field]: null }, ['id'])).toThrow();
  }
});

test('T095 isolated Then verifies 201 response, database schema/rows and GET facts without policy', async ({
  world,
}) => {
  await seedSplittingExpenses(world, [
    { 項目: '點心', 幣別: 'JPY', 金額: '100', 付款人: 'Alice', 分攤者: 'Alice、Amy、Bob' },
  ]);
  await captureCurrentAmyArrangement(world);
  await requestAmySettlement(world, '33');
  await runIsolatedStep(
    { phrase: noRoundingPolicyPhrase, input: undefined, execute: assertNoRoundingPolicy },
    world,
  );
});
