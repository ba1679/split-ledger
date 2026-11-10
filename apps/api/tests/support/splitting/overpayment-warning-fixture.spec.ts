import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from './harness.js';
import {
  seedOverpaymentWarning,
  type OverpaymentFixtureConfirmation,
  type OverpaymentFixtureRequest,
} from './overpayment-warning-fixture.js';
import type { SourceSnapshot } from './types.js';

test('T017 isolated Given stores a real unsigned repayment and server-issued confirmation', async ({
  world,
}) => {
  await runIsolatedStep(
    {
      phrase: 'Amy 應付 JPY 600 且 owner 已取得 JPY 700 的超額警告',
      input: undefined,
      execute: seedOverpaymentWarning,
    },
    world,
  );
  const request = world.get<OverpaymentFixtureRequest>('splitting:repaymentRequest');
  const confirmation = world.get<OverpaymentFixtureConfirmation>(
    'splitting:overpaymentConfirmation',
  );
  const snapshot = world.get<SourceSnapshot>('splitting:warningSnapshot');

  expect(request).toMatchObject({ amount: '700', currencyCode: 'JPY', paidOn: '2027-01-20' });
  expect(request.id).toBe(world.splitting.ids.repayments.get('pending'));
  expect(confirmation.confirmationToken).not.toBe('');
  expect(confirmation.accountingRevision).toBe(String(snapshot.trips[0]!.accounting_revision));
  expect(snapshot.repayments).toEqual([]);
  expect(world.get('splitting:sourceSnapshot')).toEqual(snapshot);
});
