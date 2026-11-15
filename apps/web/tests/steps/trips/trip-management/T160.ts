import { When, expect } from '../../../support/fixtures.js';
import type { CommittedResponseLoss } from '../../../support/trips/committed-response-loss.js';
import { managementUI } from '../../../support/trips/management-fixture.js';

When('本輪旅行操作查證結束仍未知', async ({ world }) => {
  const loss = world.get<CommittedResponseLoss>('management:responseLoss');
  expect(loss.pendingVerificationFailures).toBeGreaterThan(0);
  expect(loss.blocked).toBe(true);
  const writes = managementUI(world).writes.length;
  loss.releaseVerificationFailures();
  await expect.poll(() => loss.pendingVerificationFailures).toBe(0);
  await expect(
    managementUI(world).page.getByRole('button', { name: '再次查證', exact: true }),
  ).toBeEnabled({ timeout: 15000 });
  expect(loss.failure).toBeUndefined();
  expect(loss.blocked).toBe(true);
  expect(managementUI(world).writes.length).toBe(writes);
  world.set('management:verificationStopped', {
    operationId: loss.command!.operationId,
    tripId: loss.command!.tripId,
    writes,
  });
});
