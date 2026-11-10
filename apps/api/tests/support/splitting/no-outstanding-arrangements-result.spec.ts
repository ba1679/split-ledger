import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from './harness.js';
import { seedSplittingMembers } from './members-fixture.js';
import { readTripSettlement } from './read-settlement-command.js';
import {
  assertNoOutstandingArrangements,
  assertNoOutstandingProjection,
  noOutstandingArrangementsPhrase,
} from './no-outstanding-arrangements-result.js';
import type { SourceSnapshot } from './types.js';
import type { DeterministicSettlementView } from './reproducible-settlement-result.js';

test('T096 exact absence rejects concealed sub-minor debt and nonzero counts', () => {
  expect(noOutstandingArrangementsPhrase).toBe('結算中沒有任何待付款安排');
  const snapshot: SourceSnapshot = {
    trips: [{ accounting_revision: '0' }],
    members: [{ id: 'alice' }, { id: 'amy' }],
    expenses: [],
    shares: [],
    repayments: [],
    settlements: [],
    adjustments: [],
  };
  const view: DeterministicSettlementView = {
    accountingRevision: '0',
    simplifyDebts: false,
    explanation: '',
    balances: [],
    arrangements: [],
    directArrangementCount: 0,
    suggestedArrangementCount: 0,
  };
  expect(() => assertNoOutstandingProjection(snapshot, view)).not.toThrow();
  expect(() =>
    assertNoOutstandingProjection(snapshot, { ...view, directArrangementCount: 1 }),
  ).toThrow();
  expect(() =>
    assertNoOutstandingProjection(snapshot, { ...view, suggestedArrangementCount: 1 }),
  ).toThrow();
  const tinyDebt: SourceSnapshot = {
    ...snapshot,
    adjustments: [
      {
        member_id: 'alice',
        currency_code: 'JPY',
        numerator: '1',
        denominator: '300',
        minor_unit: 0,
      },
      {
        member_id: 'amy',
        currency_code: 'JPY',
        numerator: '-1',
        denominator: '300',
        minor_unit: 0,
      },
    ],
  };
  expect(() => assertNoOutstandingProjection(tinyDebt, view)).toThrow();
  const zeros = {
    ...view,
    balances: ['alice', 'amy'].map((memberId) => ({
      memberId,
      currencyCode: 'JPY',
      netAmount: { numerator: '0', denominator: '1', minorUnit: 0 },
    })),
  };
  expect(() => assertNoOutstandingProjection(tinyDebt, zeros)).toThrow();
});

test('T096 real member-only settlement has no outstanding arrangements', async ({ world }) => {
  await seedSplittingMembers(world);
  await readTripSettlement(world);
  await runIsolatedStep(
    {
      phrase: noOutstandingArrangementsPhrase,
      input: undefined,
      execute: assertNoOutstandingArrangements,
    },
    world,
  );
});
