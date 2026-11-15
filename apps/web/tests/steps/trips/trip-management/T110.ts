import { When, expect } from '../../../support/fixtures.js';
import { managementUI } from '../../../support/trips/management-fixture.js';
import { newTripRequestOutcome, type NewTripFlow } from '../../../support/trips/new-trip-flow.js';

When('owner 重新上傳已建立旅行的圖片', async ({ world }) => {
  expect(world.get('management:newTripRetryReady')).toBe(true);
  const flow = world.get<NewTripFlow>('management:newTripFlow');
  const creates = world.get<number>('management:newTripCreatesAtFailure');
  const tripId = world.get<string>('management:newTripIdAtFailure');

  expect(flow.creates.length).toBe(creates);
  expect(world.get('management:newTripId')).toBe(tripId);
  flow.imageStart = flow.images.length;
  await managementUI(world).page.getByRole('button', { name: '重新上傳', exact: true }).click();
  await expect.poll(() => flow.images.length - flow.imageStart, { timeout: 15000 }).toBe(1);
  const request = flow.images[flow.imageStart]!;

  expect(new URL(request.url()).pathname).toBe(`/api/trips/${tripId}/thumbnail`);
  expect(request.method()).toBe('POST');
  await newTripRequestOutcome(flow, request);
  expect(flow.creates.length).toBe(creates);
});
