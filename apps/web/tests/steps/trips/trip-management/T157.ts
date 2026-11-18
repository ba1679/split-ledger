import { When, expect } from '../../../support/fixtures.js';
import type { CreateResponseLoss } from '../../../support/trips/create-response-loss.js';
import { managementUI } from '../../../support/trips/management-fixture.js';
import { newTripRequestOutcome, type NewTripFlow } from '../../../support/trips/new-trip-flow.js';

When('owner 再次查證原次旅行建立', async ({ world }) => {
  const loss = world.get<CreateResponseLoss>('management:createResponseLoss');
  const flow = world.get<NewTripFlow>('management:newTripFlow');
  const { page } = managementUI(world);
  expect(loss.blocked).toBe(false);
  expect(flow.creates).toHaveLength(1);
  expect(flow.images).toHaveLength(0);
  const statePromise = page.waitForResponse(
    (response) =>
      response.request().method() === 'GET' &&
      new URL(response.url()).pathname === `/api/trips/${loss.tripId}/state`,
  );
  const tripPromise = page.waitForResponse(
    (response) =>
      response.request().method() === 'GET' &&
      new URL(response.url()).pathname === `/api/trips/${loss.tripId}`,
  );
  await page.getByRole('button', { name: '再次查證', exact: true }).click();
  const state = await statePromise,
    trip = await tripPromise;
  expect(state.status()).toBe(200);
  expect(trip.status()).toBe(200);
  expect(await state.finished()).toBeNull();
  expect(await trip.finished()).toBeNull();
  expect(await state.json()).toMatchObject({ state: 'active', hasThumbnail: false });
  expect(await trip.json()).toMatchObject({
    id: loss.tripId,
    name: '京都賞楓',
    startDate: null,
    endDate: null,
    hasThumbnail: false,
  });
  await expect.poll(() => flow.images.length, { timeout: 15000 }).toBe(1);
  const image = flow.images[0]!,
    response = await newTripRequestOutcome(flow, image);
  expect(response?.status()).toBe(200);
  expect(new URL(image.url()).pathname).toBe(`/api/trips/${loss.tripId}/thumbnail`);
  expect(flow.creates).toHaveLength(1);
  world.set('management:verifiedCreationImage', { request: image, response: response! });
});
