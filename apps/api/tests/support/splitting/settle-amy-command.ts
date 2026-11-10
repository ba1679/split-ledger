import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import type { PendingSettlementSnapshot } from './current-arrangement-fixture.js';
import { snapshotSplittingSources } from './expense-fixture.js';
import { splittingTripId } from './members-fixture.js';
import { captureSplittingRejectionBaseline } from './rejection.js';
import type { SourceSnapshot } from './types.js';

export const settleAmyPhrase = 'owner 以 JPY {string} 結清 Amy 向 Alice 的安排';

export function amySettlementRequest(pending: PendingSettlementSnapshot, paidAmount: string) {
  return {
    ...pending,
    expectedAmount: { ...pending.expectedAmount },
    paidAmount,
    paidOn: '2027-01-20',
  };
}

export function assertAmySettlementAtomicOutcome(
  before: SourceSnapshot,
  after: SourceSnapshot,
  pending: PendingSettlementSnapshot,
  status: number,
  partial = false,
): void {
  if (status !== 201) {
    expect(after, 'A rejected or failed settlement must leave every source unchanged').toEqual(
      before,
    );

    return;
  }
  if (partial) {
    expect(after.settlements).toEqual(before.settlements);
    expect(after.adjustments).toEqual(before.adjustments);
    expect(after.repayments).toHaveLength(before.repayments.length + 1);
    expect(after.repayments.find((row) => row.id === pending.repaymentId)).toMatchObject({
      kind: 'independent',
      settlement_id: null,
    });

    return;
  }
  expect(after.settlements).toHaveLength(before.settlements.length + 1);
  expect(after.repayments).toHaveLength(before.repayments.length + 1);
  expect(after.adjustments).toHaveLength(before.adjustments.length + 2);
  expect(after.settlements.filter((row) => row.id === pending.id)).toHaveLength(1);
  const repayments = after.repayments.filter((row) => row.settlement_id === pending.id);
  expect(repayments).toHaveLength(1);
  expect(repayments[0]).toMatchObject({ id: pending.repaymentId, kind: 'settlement' });
  const adjustments = after.adjustments.filter((row) => row.settlement_id === pending.id);
  expect(adjustments).toHaveLength(2);
  expect(adjustments.map((row) => row.member_id).sort()).toEqual(
    [pending.debtorMemberId, pending.creditorMemberId].sort(),
  );
}

/** Submit the Given's original arrangement once, including invalid paidAmount verbatim. */
export async function requestAmySettlement(world: LedgerWorld, paidAmount: string): Promise<void> {
  const pending = world.get<PendingSettlementSnapshot>('splitting:settlementSnapshot');
  const request = amySettlementRequest(pending, paidAmount);
  await captureSplittingRejectionBaseline(world);
  const before = world.splitting.snapshot!;
  world.set('splitting:before', before);
  world.set('splitting:settlementId', pending.id);
  world.set('splitting:settlementRepaymentId', pending.repaymentId);
  world.set('splitting:settlementRequest', request);
  world.response = await world.api.post(`/api/trips/${splittingTripId(world)}/settlements`, {
    headers: { Cookie: world.users.get('甲')!.cookie, Origin: world.get<string>('webOrigin') },
    data: request,
  });
  world.set('splitting:reply', await world.response.json());
  const after = await snapshotSplittingSources(world);
  world.set('splitting:after', after);
  assertAmySettlementAtomicOutcome(
    before,
    after,
    pending,
    world.response.status(),
    world.get<{ kind?: string }>('splitting:reply').kind === 'partial',
  );
}
