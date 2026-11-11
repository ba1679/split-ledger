import { randomUUID } from 'node:crypto';
import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import { splittingMemberId, splittingTripId } from './members-fixture.js';
import { captureSplittingRejectionBaseline } from './rejection.js';
import { snapshotSplittingSources } from './expense-fixture.js';

export const independentRepaymentPhrase = 'owner 記錄 Amy 向 Alice 的 JPY {string} 獨立還款';

/** Decimal text is passed verbatim so validation belongs to the real endpoint. */
export function independentRepaymentRequest(
  amount: string,
  id: string,
  members: { Amy: string; Alice: string },
) {
  return {
    id,
    payerMemberId: members.Amy,
    payeeMemberId: members.Alice,
    amount,
    currencyCode: 'JPY',
    paidOn: '2027-01-20',
  };
}

export async function recordIndependentRepayment(
  world: LedgerWorld,
  amount: string,
): Promise<void> {
  const id = randomUUID();
  const request = independentRepaymentRequest(amount, id, {
    Amy: splittingMemberId(world, 'Amy'),
    Alice: splittingMemberId(world, 'Alice'),
  });
  await captureSplittingRejectionBaseline(world);
  const before = world.splitting.snapshot!;
  world.splitting.ids.repayments.set('pending', id);
  world.set('splitting:before', before);
  world.set('splitting:repaymentId', id);
  world.set('splitting:repaymentRequest', request);
  world.response = await world.api.post(`/api/trips/${splittingTripId(world)}/repayments`, {
    headers: { Cookie: world.users.get('甲')!.cookie, Origin: world.get<string>('webOrigin') },
    data: request,
  });
  world.set('splitting:reply', await world.response.json());
  expect([201, 409], 'Product must save the repayment or return an overpayment warning').toContain(
    world.response.status(),
  );
  const after = await snapshotSplittingSources(world);
  if (world.response.status() === 201) {
    expect(after.repayments.filter((row) => row.id === id)).toHaveLength(1);
    expect(after.repayments.find((row) => row.id === id)).toMatchObject({
      payer_member_id: request.payerMemberId,
      payee_member_id: request.payeeMemberId,
      currency_code: 'JPY',
      kind: 'independent',
      settlement_id: null,
    });
    expect(after.settlements).toEqual(before.settlements);
    expect(after.adjustments).toEqual(before.adjustments);
    world.set('splitting:after', after);
  } else {
    expect(world.get('splitting:reply')).toMatchObject({
      code: 'OVERPAYMENT_CONFIRMATION_REQUIRED',
    });
    expect(after, 'An overpayment warning must not write any source or revision').toEqual(before);
  }
}
