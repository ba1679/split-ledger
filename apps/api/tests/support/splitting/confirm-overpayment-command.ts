import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import { splittingTripId } from './members-fixture.js';
import { captureSplittingRejectionBaseline } from './rejection.js';
import { snapshotSplittingSources } from './expense-fixture.js';
import type {
  OverpaymentFixtureConfirmation,
  OverpaymentFixtureRequest,
} from './overpayment-warning-fixture.js';

export const confirmOverpaymentPhrase = 'owner 明確確認同一筆 JPY 700 的超額還款';

export function confirmedOverpaymentRequest(
  request: OverpaymentFixtureRequest,
  confirmation: OverpaymentFixtureConfirmation,
) {
  return { ...request, overpaymentConfirmation: structuredClone(confirmation) };
}

/** Preserve the original warning, including when another transaction has made it stale. */
export async function submitConfirmedOverpayment(world: LedgerWorld): Promise<void> {
  const request = world.get<OverpaymentFixtureRequest>('splitting:repaymentRequest');
  const confirmation = world.get<OverpaymentFixtureConfirmation>(
    'splitting:overpaymentConfirmation',
  );
  const data = confirmedOverpaymentRequest(request, confirmation);
  await captureSplittingRejectionBaseline(world);
  world.set('splitting:before', world.splitting.snapshot);
  world.set('splitting:repaymentSubmittedRequest', data);
  world.response = await world.api.post(`/api/trips/${splittingTripId(world)}/repayments`, {
    headers: { Cookie: world.users.get('甲')!.cookie, Origin: world.get<string>('webOrigin') },
    data,
  });
  world.set('splitting:reply', await world.response.json());
  if (world.response.status() === 201) {
    const after = await snapshotSplittingSources(world);
    expect(
      after.repayments,
      'A successful confirmation must persist the reserved repayment UUID',
    ).toEqual(expect.arrayContaining([expect.objectContaining({ id: request.id })]));
    world.set('splitting:after', after);
  }
}
