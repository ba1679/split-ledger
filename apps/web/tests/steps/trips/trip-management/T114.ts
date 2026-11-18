import { When, expect } from '../../../support/fixtures.js';
import { managementUI, waitForManagementReads } from '../../../support/trips/management-fixture.js';
import type { CommittedResponseLoss } from '../../../support/trips/committed-response-loss.js';

When('owner 再次查證原旅行操作', async ({ world }) => {
  const loss = world.get<CommittedResponseLoss>('management:responseLoss');
  const command = loss.command!;
  const ui = managementUI(world);
  const writes = ui.writes.length;
  const receiptPath = `/api/trips/${command.tripId}/operations/${command.operationId}`;
  expect(loss.blocked).toBe(false);
  const responsePromise = ui.page.waitForResponse(
    (response) =>
      response.request().method() === 'GET' && new URL(response.url()).pathname === receiptPath,
  );
  await ui.page.getByRole('button', { name: '再次查證', exact: true }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  expect(await response.finished()).toBeNull();
  world.set('management:browserRecheck', await response.json());
  await waitForManagementReads(ui);
  expect(ui.writes.length).toBe(writes);
  expect(loss.mutations.length).toBe(1);
});
