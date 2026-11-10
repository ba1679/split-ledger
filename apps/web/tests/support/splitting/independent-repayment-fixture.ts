import { randomUUID } from 'node:crypto';
import { expect } from '@playwright/test';
import type { LedgerWorld } from '../../../../api/tests/support/world.js';
import { callApi } from '../../../../api/tests/support/seed.js';
import {
  splittingMemberId,
  splittingTripId,
} from '../../../../api/tests/support/splitting/members-fixture.js';
import { fixtureMinorAmount } from '../../../../api/tests/support/splitting/expense-fixture.js';
import { historicalRepaymentProjection } from '../../../../api/tests/support/splitting/preserved-settlement-history.js';
import { readBrowserSplittingSnapshot } from './fixture.js';

export const browserIndependentRepaymentPhrase =
  '分帳旅行已有 Amy 支付 Alice JPY {word} 的獨立還款';

export const browserRepaymentFixtureKey = 'splitting:browserRepaymentFixture';

export function browserRepaymentRequest(
  world: LedgerWorld,
  amount: string,
  id: string = randomUUID(),
) {
  expect(amount, 'Given repayment amount must be positive integer major units').toMatch(
    /^[1-9][0-9]*$/,
  );

  return {
    id,
    payerMemberId: splittingMemberId(world, 'Amy'),
    payeeMemberId: splittingMemberId(world, 'Alice'),
    amount,
    currencyCode: 'JPY',
    paidOn: '2027-03-12',
  };
}

/** Arrange using the actual owner endpoint, then confirm persisted facts and balances. */
export async function seedBrowserIndependentRepayment(
  world: LedgerWorld,
  amount: string,
): Promise<void> {
  const request = browserRepaymentRequest(world, amount);
  const before = await readBrowserSplittingSnapshot(world);
  const base = `/api/trips/${splittingTripId(world)}/repayments`;
  world.splitting.ids.repayments.set('browserIndependent', request.id);
  const reply = await callApi(world, 'POST', base, request);
  expect(reply.status(), 'Product must persist this legal non-overpayment owner fixture').toBe(201);
  const created = await reply.json();
  const after = await readBrowserSplittingSnapshot(world);
  expect(after.sources.expenses).toEqual(before.sources.expenses);
  expect(after.sources.shares).toEqual(before.sources.shares);
  expect(after.sources.members).toEqual(before.sources.members);
  expect(after.sources.settlements).toEqual(before.sources.settlements);
  expect(after.sources.adjustments).toEqual(before.sources.adjustments);
  expect(after.totals).toEqual(before.totals);
  expect(after.settlement.accountingRevision).toBe(
    (BigInt(before.settlement.accountingRevision) + 1n).toString(),
  );
  expect(after.sources.repayments.filter((row) => row.id !== request.id)).toEqual(
    before.sources.repayments,
  );
  const saved = after.sources.repayments.filter((row) => row.id === request.id);
  expect(saved).toHaveLength(1);
  expect(saved[0]).toMatchObject({
    trip_id: splittingTripId(world),
    payer_member_id: request.payerMemberId,
    payee_member_id: request.payeeMemberId,
    currency_code: 'JPY',
    minor_unit: 0,
    kind: 'independent',
    settlement_id: null,
  });
  expect(BigInt(String(saved[0]!.amount_minor))).toBe(fixtureMinorAmount(amount, 0));
  const expected = historicalRepaymentProjection(saved[0]!);
  expect(expected.paidOn).toBe(request.paidOn);
  expect(created).toEqual(expected);
  for (const row of after.sources.repayments)
    expect(after.repayments.items.find((item) => item.id === row.id)).toEqual(
      historicalRepaymentProjection(row),
    );
  const detail = await callApi(world, 'GET', `${base}/${request.id}`);
  expect(detail.status(), 'Product must expose the persisted repayment by its reserved UUID').toBe(
    200,
  );
  expect(await detail.json()).toEqual(expected);
  const confirmed = await readBrowserSplittingSnapshot(world);
  expect(confirmed).toEqual(after);
  world.set(browserRepaymentFixtureKey, { request, repayment: expected, before, after: confirmed });
  world.set('splitting:repaymentId', request.id);
  world.set('splitting:repaymentRequest', request);
  world.set('splitting:sourceSnapshot', confirmed.sources);
  world.set('splitting:revision', confirmed.settlement.accountingRevision);
  world.splitting.snapshot = confirmed.sources;
}
