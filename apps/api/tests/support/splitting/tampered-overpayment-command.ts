import { expect } from '@playwright/test';
import type { LedgerWorld } from '../world.js';
import { splittingTripId } from './members-fixture.js';
import { captureSplittingRejectionBaseline } from './rejection.js';
import type {
  OverpaymentFixtureConfirmation,
  OverpaymentFixtureRequest,
} from './overpayment-warning-fixture.js';

export const tamperedOverpaymentPhrase = 'owner 以變造的確認資料送出超額還款';

export function tamperedOverpaymentRequest(
  request: OverpaymentFixtureRequest,
  confirmation: OverpaymentFixtureConfirmation,
) {
  const token = confirmation.confirmationToken;
  expect(token, 'Arrange must retain a real server-issued confirmation token').not.toBe('');
  // Alter one character without changing length or the opaque token's string format.
  const offset = Math.max(0, token.lastIndexOf('.') + 1);
  const index = offset < token.length ? offset : 0;
  const replacement = token[index] === 'A' ? 'B' : 'A';

  return {
    ...request,
    overpaymentConfirmation: {
      ...confirmation,
      confirmationToken: token.slice(0, index) + replacement + token.slice(index + 1),
    },
  };
}

/** Submit exactly one confirmation command, retaining the UUID and every payment field. */
export async function submitTamperedOverpayment(world: LedgerWorld): Promise<void> {
  const request = world.get<OverpaymentFixtureRequest>('splitting:repaymentRequest');
  const confirmation = world.get<OverpaymentFixtureConfirmation>(
    'splitting:overpaymentConfirmation',
  );
  const data = tamperedOverpaymentRequest(request, confirmation);
  await captureSplittingRejectionBaseline(world);
  world.set('splitting:before', world.splitting.snapshot);
  world.set('splitting:repaymentSubmittedRequest', data);
  world.response = await world.api.post(`/api/trips/${splittingTripId(world)}/repayments`, {
    headers: { Cookie: world.users.get('甲')!.cookie, Origin: world.get<string>('webOrigin') },
    data,
  });
  world.set('splitting:reply', await world.response.json());
}
