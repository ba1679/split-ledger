import { Given, expect } from '../../../support/fixtures.js';
import type { OwnedWriteRejection } from '../../../../../api/tests/support/trip-management/write-rejection.js';
import { managementSnapshot } from '../../../../../api/tests/support/trip-management/baseline.js';
import { arrangeManagementPage } from '../../../support/trips/management-fixture.js';
import { arrangeNewTripDraft } from '../../../support/trips/new-trip-fixture.js';
import { armThumbnailFailure } from '../../../support/thumbnail/failure-fixture.js';
import { submitNewTrip, type NewTripFlow } from '../../../support/trips/new-trip-flow.js';
import { assertNewTripImageFailure } from '../../../support/trips/new-trip-image-failure.js';

Given('旅行已建立但圖片失敗且可重新上傳', async ({ page, world, browser }) => {
  await arrangeManagementPage(page, world, '新增表單');
  await arrangeNewTripDraft(world, '合法神社');
  await armThumbnailFailure(world);
  await submitNewTrip(world);
  await assertNewTripImageFailure(world, browser);
  const fault = world.get<OwnedWriteRejection>('management:thumbnailFault');
  const tripId = world.get<string>('management:newTripId');
  const before = await managementSnapshot(world, tripId);

  await fault.dispose();
  expect(world.tripManagement.cleanups.has(fault.dispose)).toBe(false);
  expect(await managementSnapshot(world, tripId)).toEqual(before);
  world.set(
    'management:newTripCreatesAtFailure',
    world.get<NewTripFlow>('management:newTripFlow').creates.length,
  );
  world.set('management:newTripIdAtFailure', tripId);
  world.set('management:newTripRetryReady', true);
});
