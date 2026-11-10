import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import type { AccessArrangement } from './access-fixture.js';
import { snapshotSplittingSources } from './expense-fixture.js';
import { splittingMemberId, splittingTripId } from './members-fixture.js';

export const settleBobPhrase = 'owner 以 JPY 34 結清 Bob 向 Alice 的剩餘安排';

export function bobSettlementRequest(
  arrangement: AccessArrangement,
  revision: string,
  id: string,
  repaymentId: string,
) {
  return {
    id,
    repaymentId,
    arrangementKey: arrangement.key,
    accountingRevision: revision,
    debtorMemberId: arrangement.debtorMemberId,
    creditorMemberId: arrangement.creditorMemberId,
    currencyCode: arrangement.currencyCode,
    expectedAmount: { ...arrangement.amount },
    paidAmount: '34',
    paidOn: '2027-01-20',
  };
}

/** Submit only Bob's reserved command; Amy's existing settlement stays historical. */
export async function settleRemainingBobArrangement(world: LedgerWorld): Promise<void> {
  const arrangement = world.get<AccessArrangement>('splitting:arrangement');
  expect(arrangement).toMatchObject({
    debtorMemberId: splittingMemberId(world, 'Bob'),
    creditorMemberId: splittingMemberId(world, 'Alice'),
    currencyCode: 'JPY',
    amount: { numerator: '100', denominator: '3', minorUnit: 0 },
  });
  const request = bobSettlementRequest(
    arrangement,
    world.get<string>('splitting:revision'),
    world.get<string>('splitting:newSettlementId'),
    world.get<string>('splitting:newRepaymentId'),
  );
  const before = await snapshotSplittingSources(world);
  world.splitting.snapshot = before;
  world.set('splitting:before', before);
  world.set('splitting:settlementRequest', request);
  world.splitting.ids.settlements.set('Bob:Alice:JPY', request.id);
  world.splitting.ids.repayments.set('settlement:Bob:Alice:JPY', request.repaymentId);
  world.response = await world.api.post(`/api/trips/${splittingTripId(world)}/settlements`, {
    headers: { Cookie: world.users.get('甲')!.cookie, Origin: world.get<string>('webOrigin') },
    data: request,
  });
  world.set('splitting:reply', await world.response.json());
  expect(world.response.status(), 'Product must save Bob’s remaining settlement').toBe(201);
}
