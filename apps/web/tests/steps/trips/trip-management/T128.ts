import { When, expect } from '../../../support/fixtures.js';
import { managementUI } from '../../../support/trips/management-fixture.js';
import { managementTripId } from '../../../../../api/tests/support/trip-management/baseline.js';

When('owner 保存 TWD 100 的早餐支出', async ({ world }) => {
  const ui = managementUI(world);
  const path = `/api/trips/${managementTripId(world)}/expenses`;
  const responsePromise = ui.page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' && new URL(response.url()).pathname === path,
  );
  await ui.page.getByRole('button', { name: '儲存支出', exact: true }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(201);
  expect(await response.finished()).toBeNull();
  expect(ui.writes.length).toBe(1);
  const request = response.request();
  expect(ui.writes[0]).toBe(request);
  const body = request.postDataJSON() as Record<string, unknown>;
  const draft = world.get<Record<string, unknown>>('management:breakfastDraft');
  expect(body).toMatchObject({ ...draft, shareMemberIds: expect.any(Array) });
  expect([...(body.shareMemberIds as string[])].sort()).toEqual(draft.shareMemberIds);
  expect(body.id).toMatch(/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i);
  world.set('management:breakfastSaved', { request: body, response: await response.json() });
});
