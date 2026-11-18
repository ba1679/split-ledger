import { Then } from '../../../support/fixtures.js';
import { assertNewTripImageFailure } from '../../../support/trips/new-trip-image-failure.js';

Then('旅行已建立但圖片未保存且可同旅行重傳', async ({ world, browser }) => {
  await assertNewTripImageFailure(world, browser);
});
