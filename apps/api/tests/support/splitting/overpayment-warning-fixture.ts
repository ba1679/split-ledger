import { randomUUID } from 'node:crypto';
import { expect } from '@playwright/test';
import type { ExactAmount } from '@split-ledger/shared';
import type { LedgerWorld } from '../world.js';
import { splittingMemberId, splittingTripId } from './members-fixture.js';
import {
  independentSplittingOracle,
  seedSplittingExpenses,
  snapshotSplittingSources,
} from './expense-fixture.js';

export interface OverpaymentFixtureRequest {
  id: string;
  payerMemberId: string;
  payeeMemberId: string;
  amount: string;
  currencyCode: string;
  paidOn: string;
}

export interface OverpaymentFixtureConfirmation {
  accountingRevision: string;
  excessAmount: ExactAmount;
  reverseDebtorMemberId: string;
  reverseCreditorMemberId: string;
  confirmationToken: string;
}

/** Arrange obtains the actual server token; confirmation remains the scenario's Act. */
export async function seedOverpaymentWarning(world: LedgerWorld): Promise<void> {
  await seedSplittingExpenses(world, [
    { 項目: '超額還款來源', 幣別: 'JPY', 金額: '600', 付款人: 'Alice', 分攤者: 'Amy' },
  ]);
  const tripId = splittingTripId(world);
  const before = await snapshotSplittingSources(world, tripId);
  const request: OverpaymentFixtureRequest = {
    id: randomUUID(),
    payerMemberId: splittingMemberId(world, 'Amy'),
    payeeMemberId: splittingMemberId(world, 'Alice'),
    amount: '700',
    currencyCode: 'JPY',
    paidOn: '2027-01-20',
  };

  expect(
    independentSplittingOracle.equal(
      independentSplittingOracle.balance(before, request.payerMemberId, 'JPY'),
      { numerator: '-600', denominator: '1', minorUnit: 0 },
    ),
  ).toBe(true);
  const response = await world.api.post(`/api/trips/${tripId}/repayments`, {
    headers: { Cookie: world.users.get('甲')!.cookie, Origin: world.get<string>('webOrigin') },
    data: request,
  });

  expect(response.status(), 'Product repayment endpoint must issue an overpayment warning').toBe(
    409,
  );
  const warning = (await response.json()) as {
    code: string;
    message: string;
    confirmation: OverpaymentFixtureConfirmation;
  };

  expect(warning.code).toBe('OVERPAYMENT_CONFIRMATION_REQUIRED');
  expect(warning.message).toEqual(expect.any(String));
  expect(warning.message.length).toBeGreaterThan(0);
  expect(warning.confirmation).toMatchObject({
    accountingRevision: String(before.trips[0]!.accounting_revision),
    reverseDebtorMemberId: request.payeeMemberId,
    reverseCreditorMemberId: request.payerMemberId,
    confirmationToken: expect.any(String),
  });
  expect(warning.confirmation.confirmationToken.length).toBeGreaterThan(0);
  expect(
    independentSplittingOracle.equal(warning.confirmation.excessAmount, {
      numerator: '100',
      denominator: '1',
      minorUnit: 0,
    }),
  ).toBe(true);
  const after = await snapshotSplittingSources(world, tripId);

  expect(
    after,
    'Warning request must leave all authoritative sources and revision unchanged',
  ).toEqual(before);
  expect(after.repayments.some((row) => row.id === request.id)).toBe(false);
  world.splitting.ids.repayments.set('pending', request.id);
  world.splitting.snapshot = after;
  world.set('splitting:repaymentRequest', request);
  world.set('splitting:overpaymentConfirmation', warning.confirmation);
  world.set('splitting:overpaymentWarning', warning);
  world.set('splitting:warningSnapshot', before);
  world.set('splitting:sourceSnapshot', after);
  world.set('splitting:before', after);
  world.set('splitting:revision', warning.confirmation.accountingRevision);
}
