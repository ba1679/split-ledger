import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from './harness.js';
import { seedOverpaymentWarning } from './overpayment-warning-fixture.js';
import {
  submitTamperedOverpayment,
  tamperedOverpaymentPhrase,
  tamperedOverpaymentRequest,
} from './tampered-overpayment-command.js';
import { snapshotSplittingSources } from './expense-fixture.js';

test('T048 registers the exact sentence and changes only one token character', () => {
  expect(tamperedOverpaymentPhrase).toBe('owner 以變造的確認資料送出超額還款');
  const request = {
    id: 'pending-uuid',
    payerMemberId: 'amy-id',
    payeeMemberId: 'alice-id',
    amount: '700',
    currencyCode: 'JPY',
    paidOn: '2027-01-20',
  };
  for (const token of ['header.payload.signature', 'Aopaque_token-0123', 'abc.']) {
    const confirmation = {
      accountingRevision: '4',
      excessAmount: { numerator: '100', denominator: '1', minorUnit: 0 },
      reverseDebtorMemberId: 'alice-id',
      reverseCreditorMemberId: 'amy-id',
      confirmationToken: token,
    };
    const result = tamperedOverpaymentRequest(request, confirmation);
    const changed = result.overpaymentConfirmation.confirmationToken;
    expect(changed).toHaveLength(token.length);
    expect([...token].filter((character, index) => character !== changed[index])).toHaveLength(1);
    expect(result).toEqual({
      ...request,
      overpaymentConfirmation: { ...confirmation, confirmationToken: changed },
    });
    expect(confirmation.confirmationToken).toBe(token);
    expect(request.amount).toBe('700');
  }
});

test('T048 isolated forged confirmation is a client rejection with sources unchanged', async ({
  world,
}) => {
  await seedOverpaymentWarning(world);
  await runIsolatedStep(
    { phrase: tamperedOverpaymentPhrase, input: undefined, execute: submitTamperedOverpayment },
    world,
  );
  expect(world.response!.status()).toBeGreaterThanOrEqual(400);
  expect(world.response!.status()).toBeLessThan(500);
  expect(await snapshotSplittingSources(world)).toEqual(world.splitting.snapshot);
  expect(world.splitting.snapshot!.repayments).not.toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: world.splitting.ids.repayments.get('pending') }),
    ]),
  );
});
