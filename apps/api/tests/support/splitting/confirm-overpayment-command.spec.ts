import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from './harness.js';
import { seedOverpaymentWarning } from './overpayment-warning-fixture.js';
import { seedStaleOverpaymentWarning } from './stale-warning-fixture.js';
import { snapshotSplittingSources } from './expense-fixture.js';
import {
  confirmedOverpaymentRequest,
  confirmOverpaymentPhrase,
  submitConfirmedOverpayment,
} from './confirm-overpayment-command.js';

test('T050 preserves the original UUID, payment fields and complete server confirmation', () => {
  expect(confirmOverpaymentPhrase).toBe('owner 明確確認同一筆 JPY 700 的超額還款');
  const request = {
    id: 'pending-uuid',
    payerMemberId: 'amy-id',
    payeeMemberId: 'alice-id',
    amount: '700',
    currencyCode: 'JPY',
    paidOn: '2027-01-20',
  };
  const confirmation = {
    accountingRevision: '4',
    excessAmount: { numerator: '100', denominator: '1', minorUnit: 0 },
    reverseDebtorMemberId: 'alice-id',
    reverseCreditorMemberId: 'amy-id',
    confirmationToken: 'actual-server-token',
  };
  const original = structuredClone({ request, confirmation });
  expect(confirmedOverpaymentRequest(request, confirmation)).toEqual({
    ...request,
    overpaymentConfirmation: confirmation,
  });
  expect({ request, confirmation }).toEqual(original);
});

for (const stale of [false, true]) {
  test(`T050 isolated confirmation ${stale ? 'rejects the old revision' : 'persists the reserved UUID'}`, async ({
    world,
  }) => {
    await seedOverpaymentWarning(world);
    if (stale) await seedStaleOverpaymentWarning(world);
    await runIsolatedStep(
      { phrase: confirmOverpaymentPhrase, input: undefined, execute: submitConfirmedOverpayment },
      world,
    );
    expect(world.response!.status()).toBe(stale ? 409 : 201);
    if (stale) {
      expect(world.get('splitting:reply')).toMatchObject({ code: 'ACCOUNTING_REVISION_CONFLICT' });
      expect(await snapshotSplittingSources(world)).toEqual(world.splitting.snapshot);
    } else {
      expect(world.get('splitting:reply')).toMatchObject({
        id: world.splitting.ids.repayments.get('pending'),
        amount: '700',
        kind: 'independent',
        settlementId: null,
      });
    }
  });
}
