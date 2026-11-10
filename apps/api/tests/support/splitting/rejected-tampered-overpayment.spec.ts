import { test, expect } from '../fixtures.js';
import { runIsolatedStep } from './harness.js';
import { seedOverpaymentWarning } from './overpayment-warning-fixture.js';
import { submitTamperedOverpayment } from './tampered-overpayment-command.js';
import {
  assertRejectedTamperedOverpayment,
  assertTamperedConfirmationRejected,
  rejectedTamperedOverpaymentPhrase,
} from './rejected-tampered-overpayment.js';

test('T080 accepts unspecified client errors but never successful or server-error outcomes', () => {
  expect(rejectedTamperedOverpaymentPhrase).toBe('變造確認未獲接受且沒有保存還款');
  expect(rejectedTamperedOverpaymentPhrase).not.toMatch(/[{}]/);
  for (const status of [400, 401, 403, 404, 409, 422, 499])
    expect(() => assertTamperedConfirmationRejected(status)).not.toThrow();
  for (const status of [200, 201, 204, 302, 399, 500, 503])
    expect(() => assertTamperedConfirmationRejected(status)).toThrow();
});

test('T080 isolated Then verifies real rejected confirmation and unchanged authoritative arrangement', async ({
  world,
}) => {
  await seedOverpaymentWarning(world);
  await submitTamperedOverpayment(world);
  await runIsolatedStep(
    {
      phrase: rejectedTamperedOverpaymentPhrase,
      input: undefined,
      execute: assertRejectedTamperedOverpayment,
    },
    world,
  );
});
