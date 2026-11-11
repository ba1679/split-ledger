import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from './harness.js';
import { seedAmySettledBobOutstanding } from './sequential-settlement-fixture.js';
import {
  bobSettlementRequest,
  settleBobPhrase,
  settleRemainingBobArrangement,
} from './settle-bob-command.js';

test('T054 preserves the current exact amount and both reserved IDs', () => {
  const arrangement = {
    key: 'current-bob-key',
    debtorMemberId: 'bob',
    creditorMemberId: 'alice',
    currencyCode: 'JPY',
    amount: { numerator: '100', denominator: '3', minorUnit: 0 },
  };
  expect(bobSettlementRequest(arrangement, '9', 'new-settlement', 'new-repayment')).toEqual({
    id: 'new-settlement',
    repaymentId: 'new-repayment',
    arrangementKey: 'current-bob-key',
    accountingRevision: '9',
    debtorMemberId: 'bob',
    creditorMemberId: 'alice',
    currencyCode: 'JPY',
    expectedAmount: { numerator: '100', denominator: '3', minorUnit: 0 },
    paidAmount: '34',
    paidOn: '2027-01-20',
  });
});

test('T054 submits Bob once after Amy’s historical settlement', async ({ world }) => {
  await seedAmySettledBobOutstanding(world);
  await runIsolatedStep(
    { phrase: settleBobPhrase, input: undefined, execute: settleRemainingBobArrangement },
    world,
  );
  expect(world.get('splitting:reply')).toEqual(await world.response!.json());
});
