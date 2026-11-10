import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import { callApi } from '../seed.js';
import { readAccessSettlement } from './access-fixture.js';
import { independentSplittingOracle, snapshotSplittingSources } from './expense-fixture.js';
import {
  assertExactArrangementSet,
  directExpenseArrangements,
} from './expense-arrangements-result.js';
import { splittingMemberId, splittingTripId } from './members-fixture.js';
import type {
  OverpaymentFixtureConfirmation,
  OverpaymentFixtureRequest,
} from './overpayment-warning-fixture.js';
import type { SourceSnapshot } from './types.js';

export const overpaymentWarningResultPhrase = '超額還款尚未保存並回傳 JPY 100 的反向應付警告';

/** Verify the real server warning rather than manufacturing confirmation material. */
export function assertOverpaymentWarningBody(
  body: unknown,
  revision: string,
  members: { Alice: string; Amy: string },
): void {
  expect(body).toMatchObject({
    code: 'OVERPAYMENT_CONFIRMATION_REQUIRED',
    message: expect.any(String),
    confirmation: {
      accountingRevision: revision,
      reverseDebtorMemberId: members.Alice,
      reverseCreditorMemberId: members.Amy,
      confirmationToken: expect.any(String),
    },
  });
  const warning = body as { message: string; confirmation: OverpaymentFixtureConfirmation };
  expect(Object.keys(warning).sort()).toEqual(['code', 'message', 'confirmation'].sort());
  expect(Object.keys(warning.confirmation).sort()).toEqual(
    [
      'accountingRevision',
      'confirmationToken',
      'excessAmount',
      'reverseCreditorMemberId',
      'reverseDebtorMemberId',
    ].sort(),
  );
  expect(warning.confirmation.confirmationToken.trim().length).toBeGreaterThan(0);
  const amount = warning.confirmation.excessAmount;
  expect(amount).toMatchObject({
    numerator: expect.any(String),
    denominator: expect.any(String),
    minorUnit: expect.any(Number),
  });
  expect(amount.numerator).toMatch(/^[1-9]\d*$/);
  expect(amount.denominator).toMatch(/^[1-9]\d*$/);
  expect(Number.isInteger(amount.minorUnit) && amount.minorUnit >= 0 && amount.minorUnit <= 4).toBe(
    true,
  );
  expect(
    independentSplittingOracle.equal(amount, { numerator: '100', denominator: '1', minorUnit: 0 }),
  ).toBe(true);
  // Wording remains flexible, but all three amounts must be explained to the owner.
  for (const number of ['700', '600', '100'])
    expect(warning.message).toMatch(new RegExp(`(?:^|[^\\d])${number}(?:[^\\d]|$)`));
  expect(warning.message).toMatch(/超|多/);
}

export async function assertUnsavedOverpaymentWarning(world: LedgerWorld): Promise<void> {
  expect(world.response, 'When must retain the real repayment response').toBeDefined();
  expect(world.response!.status()).toBe(409);
  const before = world.get<SourceSnapshot>('splitting:before');
  const request = world.get<OverpaymentFixtureRequest>('splitting:repaymentRequest');
  const members = {
    Alice: splittingMemberId(world, 'Alice'),
    Amy: splittingMemberId(world, 'Amy'),
  };
  expect(request).toMatchObject({
    id: world.splitting.ids.repayments.get('pending'),
    amount: '700',
    currencyCode: 'JPY',
    payerMemberId: members.Amy,
    payeeMemberId: members.Alice,
  });
  assertOverpaymentWarningBody(
    await world.response!.json(),
    String(before.trips[0]!.accounting_revision),
    members,
  );
  const expected = [
    {
      debtorMemberId: members.Amy,
      creditorMemberId: members.Alice,
      currencyCode: 'JPY',
      amount: { numerator: '600', denominator: '1', minorUnit: 0 },
    },
  ];
  assertExactArrangementSet(directExpenseArrangements(before), expected);
  expect(before.repayments.some((row) => row.id === request.id)).toBe(false);
  const after = await snapshotSplittingSources(world);
  expect(after, 'Warning must preserve all sources, history and accounting revision').toEqual(
    before,
  );
  expect(after.repayments.some((row) => row.id === request.id)).toBe(false);
  const missing = await callApi(
    world,
    'GET',
    `/api/trips/${splittingTripId(world)}/repayments/${request.id}`,
  );
  expect(missing.status(), 'Reserved repayment must remain unpersisted').toBe(404);
  const view = await readAccessSettlement(world);
  expect(view.accountingRevision).toBe(String(before.trips[0]!.accounting_revision));
  assertExactArrangementSet(view.arrangements, expected);
  expect(
    await snapshotSplittingSources(world),
    'Confirmation reads must not persist the warned payment',
  ).toEqual(before);
}
