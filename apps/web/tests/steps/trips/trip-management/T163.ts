import { When, expect } from '../../../support/fixtures.js';
import { managementUI, waitForManagementReads } from '../../../support/trips/management-fixture.js';

When('owner 查證返回後的原次圖片保存', async ({ world }) => {
  const returned = world.get<{ tripId: string; operationId: string }>(
    'management:returnedImageVerification',
  );
  const ui = managementUI(world);
  const path = `/api/trips/${returned.tripId}/operations/${returned.operationId}`;
  const responsePromise = ui.page.waitForResponse(
    (response) =>
      response.request().method() === 'GET' && new URL(response.url()).pathname === path,
  );
  await ui.page.getByRole('button', { name: '再次查證', exact: true }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  expect(await response.finished()).toBeNull();
  world.set('management:returnedImageReceipt', await response.json());
  await waitForManagementReads(ui);
  expect(ui.writes.length).toBe(1);
});
