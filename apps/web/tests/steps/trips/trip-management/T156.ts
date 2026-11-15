import { Given, expect } from '../../../support/fixtures.js';
import {
  arrangeCreateResponseLoss,
  releaseCreateResponseLoss,
  type CreateResponseLoss,
} from '../../../support/trips/create-response-loss.js';
import { assertCreateUnknown } from '../../../support/trips/create-unknown-result.js';
import { managementSnapshot } from '../../../../../api/tests/support/trip-management/baseline.js';
import { ownerRead } from '../../../../../api/tests/support/trip-management/preservation.js';
import { expectedCurrentState } from '../../../../../api/tests/support/trip-management/rejections.js';
import type { NewTripFlow } from '../../../support/trips/new-trip-flow.js';

Given('原次建立結果未知且現在狀態可確認為一般可用', async ({ page, world }) => {
  await arrangeCreateResponseLoss(page, world);
  await releaseCreateResponseLoss(world);
  await assertCreateUnknown(world);
  const loss = world.get<CreateResponseLoss>('management:createResponseLoss');
  const state = await ownerRead(world, `/api/trips/${loss.tripId}/state`);
  expect(state.status()).toBe(200);
  expect(await state.json()).toEqual(expectedCurrentState(loss.created!));
  const trip = await ownerRead(world, `/api/trips/${loss.tripId}`);
  expect(trip.status()).toBe(200);
  expect(await trip.json()).toMatchObject({
    id: loss.tripId,
    name: '京都賞楓',
    hasThumbnail: false,
    lifecycleRevision: '0',
    thumbnailRevision: '0',
  });
  expect(await managementSnapshot(world, loss.tripId)).toEqual(loss.created);
  expect(world.get<NewTripFlow>('management:newTripFlow').images).toHaveLength(0);
  world.set('management:creationVerificationReady', {
    tripId: loss.tripId,
    verificationStart: loss.verifications.length,
  });
  loss.unblock();
});
